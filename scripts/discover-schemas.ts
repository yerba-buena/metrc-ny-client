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
import { NY_PROD_BASE_URL } from "../src/constants.js";
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

const request = createRequester({
  vendorApiKey,
  userApiKey,
  licenseNumber,
  baseUrl: NY_PROD_BASE_URL,
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
}

const targets: DiscoveryTarget[] = [
  { endpoint: "/transfers/v2/incoming", outputFile: "transfers-v2-incoming-sanity.json" },
  { endpoint: "/locations/v2/active", outputFile: "locations-v2-active-sample.json" },
  { endpoint: "/packages/v2/active", outputFile: "packages-v2-active-sample.json" },
];

async function discover(target: DiscoveryTarget) {
  console.log(`\n=== ${target.endpoint} ===`);
  const response = await request<PaginatedResponse<unknown>>(target.endpoint, {
    pageNumber: "1",
    pageSize: "5",
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
  if (failures > 0) {
    console.log(`\n${failures} endpoint(s) failed.`);
    process.exit(1);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Discovery failed:", err);
  process.exit(1);
});
