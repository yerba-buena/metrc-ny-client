/**
 * One-shot script to discover the response shapes of METRC v2 endpoints.
 *
 * Usage:
 *   1. Fill in values in .env (gitignored)
 *   2. npm run discover
 */
import "dotenv/config";
import { createRequester } from "../src/transport/request.js";
import type { PaginatedResponse } from "../src/transport/pagination.js";
import { NY_PROD_BASE_URL, NY_SANDBOX_BASE_URL } from "../src/constants.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Missing env var: ${name}`);
    process.exit(1);
  }
  return val;
}

const vendorApiKey = requireEnv("METRC_VENDOR_API_KEY");
const userApiKey = requireEnv("METRC_USER_API_KEY");
const licenseNumber = requireEnv("METRC_LICENSE_NUMBER");

const baseUrl = process.env.METRC_BASE_URL ?? NY_SANDBOX_BASE_URL;
console.log(`Using METRC base URL: ${baseUrl}`);
if (baseUrl === NY_PROD_BASE_URL || baseUrl.startsWith("https://api-ny.")) {
  console.warn("  WARNING: targeting PRODUCTION METRC. Read-only operations only.");
}

const request = createRequester({
  vendorApiKey,
  userApiKey,
  licenseNumber,
  baseUrl,
  logger: {
    debug: (msg) => console.log(`  ${msg}`),
    info: (msg) => console.log(`  ${msg}`),
    warn: (msg) => console.warn(`  ${msg}`),
    error: (msg) => console.error(`  ${msg}`),
  },
});

interface DiscoveryTarget {
  endpoint: string;
  outputFile: string;
  extraParams?: Record<string, string>;
}

const widePeriod = {
  lastModifiedStart: "2015-01-01T00:00:00Z",
  lastModifiedEnd: new Date().toISOString(),
};

const targets: DiscoveryTarget[] = [
  { endpoint: "/transfers/v2/incoming", outputFile: "transfers-v2-incoming-sanity.json" },
  { endpoint: "/locations/v2/active", outputFile: "locations-v2-active-sample.json", extraParams: widePeriod },
  { endpoint: "/packages/v2/active", outputFile: "packages-v2-active-sample.json" },
];

// Audit targets for the LastModified-quirk discovery (Phase 0 Task 3).
// Each pair runs the endpoint twice: bare (no window) vs wide window,
// so we can see whether the bare response is silently empty.
// Payload contains COUNTS ONLY (no row data) to avoid committing PII;
// output goes under docs/superpowers/audits/ (not under scripts/fixtures/
// which is git-ignored to keep live-data samples out of the repo).
const AUDITS_DIR = join(__dirname, "..", "docs", "superpowers", "audits");

const auditPairs: Array<{ endpoint: string; outputFile: string }> = [
  { endpoint: "/packages/v2/active", outputFile: "audit-lastmodified-packages-active.json" },
  { endpoint: "/transfers/v2/incoming", outputFile: "audit-lastmodified-transfers-incoming.json" },
];

async function discoverPair(target: { endpoint: string; outputFile: string }) {
  console.log(`\n=== AUDIT ${target.endpoint} ===`);
  const bare = await request<PaginatedResponse<unknown>>(target.endpoint, { pageNumber: "1", pageSize: "5" });
  const windowed = await request<PaginatedResponse<unknown>>(target.endpoint, {
    pageNumber: "1", pageSize: "5", ...widePeriod,
  });
  const payload = {
    endpoint: target.endpoint,
    capturedAt: new Date().toISOString(),
    bareRequest: { totalRecords: bare.TotalRecords, recordsOnPage: bare.RecordsOnPage },
    windowedRequest: { totalRecords: windowed.TotalRecords, recordsOnPage: windowed.RecordsOnPage },
    verdict: bare.TotalRecords === 0 && windowed.TotalRecords > 0
      ? "QUIRKED: bare returns empty; window required"
      : bare.TotalRecords === windowed.TotalRecords
        ? "OK: bare and windowed match"
        : "INCONCLUSIVE: counts differ but bare is non-zero",
  };
  const pretty = JSON.stringify(payload, null, 2);
  console.log(pretty);
  mkdirSync(AUDITS_DIR, { recursive: true });
  writeFileSync(join(AUDITS_DIR, target.outputFile), pretty + "\n");
}

async function auditDeliveriesPackages() {
  console.log(`\n=== AUDIT /transfers/v2/deliveries/{id}/packages ===`);
  const incoming = await request<PaginatedResponse<{ DeliveryId?: number }>>(
    "/transfers/v2/incoming",
    { pageNumber: "1", pageSize: "1", ...widePeriod },
  );
  const firstDeliveryId = incoming.Data?.[0]?.DeliveryId;
  if (typeof firstDeliveryId !== "number") {
    const payload = {
      endpoint: "/transfers/v2/deliveries/{id}/packages",
      capturedAt: new Date().toISOString(),
      verdict: "INCONCLUSIVE: no incoming transfers available to pick a delivery id; recommend reusing the wide-window pattern as the safe default.",
    };
    const pretty = JSON.stringify(payload, null, 2);
    console.log(pretty);
    mkdirSync(AUDITS_DIR, { recursive: true });
    writeFileSync(join(AUDITS_DIR, "audit-lastmodified-deliveries-packages.json"), pretty + "\n");
    return;
  }
  await discoverPair({
    endpoint: `/transfers/v2/deliveries/${firstDeliveryId}/packages`,
    outputFile: "audit-lastmodified-deliveries-packages.json",
  });
}

async function discover(target: DiscoveryTarget) {
  console.log(`\n=== ${target.endpoint} ===`);
  const response = await request<PaginatedResponse<unknown>>(target.endpoint, {
    pageNumber: "1",
    pageSize: "5",
    ...(target.extraParams ?? {}),
  });

  const pretty = JSON.stringify(response, null, 2);
  console.log(pretty);

  mkdirSync(FIXTURES_DIR, { recursive: true });
  const outPath = join(FIXTURES_DIR, target.outputFile);
  writeFileSync(outPath, pretty + "\n");
  console.log(`\nSaved to ${outPath}`);

  if (response.Data && response.Data.length > 0) {
    console.log(`\nField names (first item):`);
    const first = response.Data[0] as Record<string, unknown>;
    for (const [key, value] of Object.entries(first)) {
      const type = value === null ? "null" : typeof value;
      console.log(`  ${key}: ${type} = ${JSON.stringify(value)}`);
    }
  }
}

async function main() {
  let failures = 0;
  for (const target of targets) {
    try {
      await discover(target);
    } catch (err) {
      failures++;
      console.error(`\nFAILED ${target.endpoint}:`, err);
    }
  }
  for (const target of auditPairs) {
    try {
      await discoverPair(target);
    } catch (err) {
      failures++;
      console.error(`\nFAILED AUDIT ${target.endpoint}:`, err);
    }
  }
  try {
    await auditDeliveriesPackages();
  } catch (err) {
    failures++;
    console.error(`\nFAILED AUDIT /transfers/v2/deliveries/{id}/packages:`, err);
  }
  if (failures > 0) {
    console.log(`\n${failures} target(s) failed.`);
    process.exit(1);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Discovery failed:", err);
  process.exit(1);
});
