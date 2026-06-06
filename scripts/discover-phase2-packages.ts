/**
 * Phase 2 discovery: capture response shapes for 7 packages v2 endpoints.
 *
 * Produces: docs/superpowers/audits/discover-packages-v2-*.json
 * Field types only (no values, no PII).
 */
import "dotenv/config";
import { createRequester } from "../src/transport/request.js";
import type { PaginatedResponse } from "../src/transport/pagination.js";
import { NY_PROD_BASE_URL, NY_SANDBOX_BASE_URL } from "../src/constants.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDITS_DIR = join(__dirname, "..", "docs", "superpowers", "audits");

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

const baseUrl = process.env.METRC_BASE_URL ?? NY_PROD_BASE_URL;
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

const widePeriod = {
  lastModifiedStart: "2015-01-01T00:00:00Z",
  lastModifiedEnd: new Date().toISOString(),
};

interface DiscoveryAudit {
  endpoint: string;
  capturedAt: string;
  method: "GET";
  envelope: "paginated" | "bare-array" | "single-object";
  totalRecords?: number;
  naturalKey: string | null | "composite";
  lastModifiedQuirkCheck: "OK" | "QUIRKED" | "INCONCLUSIVE" | "N/A";
  notes: string;
  fieldTypes: Record<string, string>;
}

function inferTypes(obj: unknown): Record<string, string> {
  if (obj === null || typeof obj !== "object") return {};
  const types: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value === null) {
      types[key] = "null";
    } else if (Array.isArray(value)) {
      types[key] = "array";
    } else if (typeof value === "object") {
      types[key] = "object";
    } else {
      types[key] = typeof value;
    }
  }
  return types;
}

async function auditInactivePackages() {
  console.log(`\n=== AUDIT /packages/v2/inactive ===`);
  const bare = await request<PaginatedResponse<unknown>>("/packages/v2/inactive", {
    pageNumber: "1",
    pageSize: "5",
  });
  const windowed = await request<PaginatedResponse<unknown>>("/packages/v2/inactive", {
    pageNumber: "1",
    pageSize: "5",
    ...widePeriod,
  });
  const verdict =
    bare.TotalRecords === 0 && windowed.TotalRecords > 0
      ? "QUIRKED"
      : bare.TotalRecords === windowed.TotalRecords
        ? "OK"
        : "INCONCLUSIVE";

  const fieldTypes = bare.Data && bare.Data.length > 0 ? inferTypes(bare.Data[0]) : {};

  const payload: DiscoveryAudit = {
    endpoint: "/packages/v2/inactive",
    capturedAt: new Date().toISOString(),
    method: "GET",
    envelope: "paginated",
    totalRecords: windowed.TotalRecords,
    naturalKey: "Id",
    lastModifiedQuirkCheck: verdict,
    notes: `bare count: ${bare.TotalRecords}, windowed count: ${windowed.TotalRecords}`,
    fieldTypes,
  };

  const pretty = JSON.stringify(payload, null, 2);
  console.log(pretty);
  mkdirSync(AUDITS_DIR, { recursive: true });
  writeFileSync(join(AUDITS_DIR, "discover-packages-v2-inactive.json"), pretty + "\n");
}

async function auditOnholdPackages() {
  console.log(`\n=== AUDIT /packages/v2/onhold ===`);
  const bare = await request<PaginatedResponse<unknown>>("/packages/v2/onhold", {
    pageNumber: "1",
    pageSize: "5",
  });
  const windowed = await request<PaginatedResponse<unknown>>("/packages/v2/onhold", {
    pageNumber: "1",
    pageSize: "5",
    ...widePeriod,
  });
  const verdict =
    bare.TotalRecords === 0 && windowed.TotalRecords > 0
      ? "QUIRKED"
      : bare.TotalRecords === windowed.TotalRecords
        ? "OK"
        : "INCONCLUSIVE";

  const fieldTypes = bare.Data && bare.Data.length > 0 ? inferTypes(bare.Data[0]) : {};

  const payload: DiscoveryAudit = {
    endpoint: "/packages/v2/onhold",
    capturedAt: new Date().toISOString(),
    method: "GET",
    envelope: "paginated",
    totalRecords: windowed.TotalRecords,
    naturalKey: "Id",
    lastModifiedQuirkCheck: verdict,
    notes: `bare count: ${bare.TotalRecords}, windowed count: ${windowed.TotalRecords}`,
    fieldTypes,
  };

  const pretty = JSON.stringify(payload, null, 2);
  console.log(pretty);
  mkdirSync(AUDITS_DIR, { recursive: true });
  writeFileSync(join(AUDITS_DIR, "discover-packages-v2-onhold.json"), pretty + "\n");
}

async function discoverEndpoint(
  endpoint: string,
  outputFile: string,
  envelope: "paginated" | "bare-array" | "single-object",
  params: Record<string, string> = {},
) {
  console.log(`\n=== DISCOVER ${endpoint} ===`);
  try {
    const response = await request<unknown>(endpoint, {
      pageNumber: envelope === "paginated" ? "1" : undefined,
      pageSize: envelope === "paginated" ? "5" : undefined,
      ...params,
    });

    const fieldTypes = (() => {
      if (envelope === "paginated") {
        const pResp = response as PaginatedResponse<unknown>;
        return pResp.Data && pResp.Data.length > 0 ? inferTypes(pResp.Data[0]) : {};
      } else if (envelope === "bare-array") {
        const arrResp = response as unknown[];
        // Check if it's actually a bare array of strings
        if (Array.isArray(arrResp) && arrResp.length > 0) {
          const first = arrResp[0];
          if (typeof first === "string" || typeof first === "number" || typeof first === "boolean") {
            // Simple scalar array
            return {};
          }
          return inferTypes(first);
        }
        return {};
      } else {
        return inferTypes(response);
      }
    })();

    const totalRecords = (() => {
      if (envelope === "paginated") {
        const pResp = response as PaginatedResponse<unknown>;
        return pResp.TotalRecords;
      }
      return undefined;
    })();

    const payload: DiscoveryAudit = {
      endpoint,
      capturedAt: new Date().toISOString(),
      method: "GET",
      envelope,
      totalRecords,
      naturalKey: null,
      lastModifiedQuirkCheck: "N/A",
      notes: `shape captured`,
      fieldTypes,
    };

    const pretty = JSON.stringify(payload, null, 2);
    console.log(pretty);
    mkdirSync(AUDITS_DIR, { recursive: true });
    writeFileSync(join(AUDITS_DIR, outputFile), pretty + "\n");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`ERROR: ${errMsg}`);

    // For errors like 404, use placeholder in endpoint name
    let recordedEndpoint = endpoint;
    if (errMsg.includes("404")) {
      recordedEndpoint = endpoint.replace(/\/\d+/, "/{id}").replace(/\/1A[A-Z0-9]+/, "/{label}");
    }

    const payload: DiscoveryAudit = {
      endpoint: recordedEndpoint,
      capturedAt: new Date().toISOString(),
      method: "GET",
      envelope,
      naturalKey: null,
      lastModifiedQuirkCheck: "N/A",
      notes: `ERROR: ${errMsg}`,
      fieldTypes: {},
    };

    const pretty = JSON.stringify(payload, null, 2);
    mkdirSync(AUDITS_DIR, { recursive: true });
    writeFileSync(join(AUDITS_DIR, outputFile), pretty + "\n");
  }
}

async function getSamplePackage(): Promise<{ id: number; label: string } | null> {
  console.log(`\n=== Getting sample package ID from /packages/v2/active ===`);
  try {
    const response = await request<PaginatedResponse<{ Id?: number; Label?: string }>>(
      "/packages/v2/active",
      {
        pageNumber: "1",
        pageSize: "1",
        ...widePeriod,
      },
    );
    if (response.Data && response.Data.length > 0) {
      const first = response.Data[0];
      if (typeof first.Id === "number" && typeof first.Label === "string") {
        console.log(`Found sample package (id=${first.Id})`);
        return { id: first.Id, label: first.Label };
      }
    }
  } catch (err) {
    console.error(`Failed to get sample package:`, err);
  }
  return null;
}

async function main() {
  let failures = 0;

  // Endpoints 1–2: LastModified quirk audit
  try {
    await auditInactivePackages();
  } catch (err) {
    failures++;
    console.error(`\nFAILED /packages/v2/inactive:`, err);
  }

  try {
    await auditOnholdPackages();
  } catch (err) {
    failures++;
    console.error(`\nFAILED /packages/v2/onhold:`, err);
  }

  // Endpoints 3–4: Lookup lists
  // /packages/v2/types returns bare array of strings
  // /packages/v2/adjust/reasons returns paginated response with Data array
  try {
    await discoverEndpoint("/packages/v2/types", "discover-packages-v2-types.json", "bare-array");
  } catch (err) {
    failures++;
    console.error(`\nFAILED /packages/v2/types:`, err);
  }

  try {
    await discoverEndpoint(
      "/packages/v2/adjust/reasons",
      "discover-packages-v2-adjust-reasons.json",
      "paginated",
    );
  } catch (err) {
    failures++;
    console.error(`\nFAILED /packages/v2/adjust/reasons:`, err);
  }

  // Endpoints 5–7: Single object detail, label lookup, and history
  const sample = await getSamplePackage();
  if (sample) {
    console.log(`\n=== DISCOVER /packages/v2/{id} (using sample id: ${sample.id}) ===`);
    try {
      const response = await request<unknown>(`/packages/v2/${sample.id}`, {});
      const fieldTypes = inferTypes(response);
      const payload: DiscoveryAudit = {
        endpoint: "/packages/v2/{id}",
        capturedAt: new Date().toISOString(),
        method: "GET",
        envelope: "single-object",
        naturalKey: null,
        lastModifiedQuirkCheck: "N/A",
        notes: "shape captured",
        fieldTypes,
      };
      const pretty = JSON.stringify(payload, null, 2);
      console.log(pretty);
      mkdirSync(AUDITS_DIR, { recursive: true });
      writeFileSync(join(AUDITS_DIR, "discover-packages-v2-by-id.json"), pretty + "\n");
    } catch (err) {
      failures++;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`ERROR: ${errMsg}`);
      const payload: DiscoveryAudit = {
        endpoint: "/packages/v2/{id}",
        capturedAt: new Date().toISOString(),
        method: "GET",
        envelope: "single-object",
        naturalKey: null,
        lastModifiedQuirkCheck: "N/A",
        notes: `ERROR: ${errMsg}`,
        fieldTypes: {},
      };
      mkdirSync(AUDITS_DIR, { recursive: true });
      writeFileSync(
        join(AUDITS_DIR, "discover-packages-v2-by-id.json"),
        JSON.stringify(payload, null, 2) + "\n",
      );
    }

    console.log(`\n=== DISCOVER /packages/v2/{label} (using sample label) ===`);
    try {
      const response = await request<unknown>(`/packages/v2/${sample.label}`, {});
      const fieldTypes = inferTypes(response);
      const payload: DiscoveryAudit = {
        endpoint: "/packages/v2/{label}",
        capturedAt: new Date().toISOString(),
        method: "GET",
        envelope: "single-object",
        naturalKey: null,
        lastModifiedQuirkCheck: "N/A",
        notes: "shape captured",
        fieldTypes,
      };
      const pretty = JSON.stringify(payload, null, 2);
      console.log(pretty);
      mkdirSync(AUDITS_DIR, { recursive: true });
      writeFileSync(join(AUDITS_DIR, "discover-packages-v2-by-label.json"), pretty + "\n");
    } catch (err) {
      failures++;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`ERROR: ${errMsg}`);
      const payload: DiscoveryAudit = {
        endpoint: "/packages/v2/{label}",
        capturedAt: new Date().toISOString(),
        method: "GET",
        envelope: "single-object",
        naturalKey: null,
        lastModifiedQuirkCheck: "N/A",
        notes: `ERROR: ${errMsg}`,
        fieldTypes: {},
      };
      mkdirSync(AUDITS_DIR, { recursive: true });
      writeFileSync(
        join(AUDITS_DIR, "discover-packages-v2-by-label.json"),
        JSON.stringify(payload, null, 2) + "\n",
      );
    }

    console.log(`\n=== DISCOVER /packages/v2/{id}/history (using sample id) ===`);
    try {
      const response = await request<PaginatedResponse<unknown>>(`/packages/v2/${sample.id}/history`, {
        pageNumber: "1",
        pageSize: "5",
      });
      const fieldTypes = response.Data && response.Data.length > 0 ? inferTypes(response.Data[0]) : {};
      const payload: DiscoveryAudit = {
        endpoint: "/packages/v2/{id}/history",
        capturedAt: new Date().toISOString(),
        method: "GET",
        envelope: "paginated",
        totalRecords: response.TotalRecords,
        naturalKey: null,
        lastModifiedQuirkCheck: "N/A",
        notes: "shape captured",
        fieldTypes,
      };
      const pretty = JSON.stringify(payload, null, 2);
      console.log(pretty);
      mkdirSync(AUDITS_DIR, { recursive: true });
      writeFileSync(join(AUDITS_DIR, "discover-packages-v2-history.json"), pretty + "\n");
    } catch (err) {
      failures++;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`ERROR: ${errMsg}`);
      const payload: DiscoveryAudit = {
        endpoint: "/packages/v2/{id}/history",
        capturedAt: new Date().toISOString(),
        method: "GET",
        envelope: "paginated",
        naturalKey: null,
        lastModifiedQuirkCheck: "N/A",
        notes: `ERROR: ${errMsg}`,
        fieldTypes: {},
      };
      mkdirSync(AUDITS_DIR, { recursive: true });
      writeFileSync(
        join(AUDITS_DIR, "discover-packages-v2-history.json"),
        JSON.stringify(payload, null, 2) + "\n",
      );
    }
  } else {
    console.warn("Could not obtain sample package; skipping endpoints 5–7");
    failures += 3;

    // Write empty placeholders
    mkdirSync(AUDITS_DIR, { recursive: true });
    for (const [file, ep] of [
      ["discover-packages-v2-by-id.json", "/packages/v2/{id}"],
      ["discover-packages-v2-by-label.json", "/packages/v2/{label}"],
      ["discover-packages-v2-history.json", "/packages/v2/{id}/history"],
    ]) {
      const payload: DiscoveryAudit = {
        endpoint: ep,
        capturedAt: new Date().toISOString(),
        method: "GET",
        envelope: "single-object",
        naturalKey: null,
        lastModifiedQuirkCheck: "N/A",
        notes: "No sample package available from /packages/v2/active",
        fieldTypes: {},
      };
      writeFileSync(join(AUDITS_DIR, file), JSON.stringify(payload, null, 2) + "\n");
    }
  }

  if (failures > 0) {
    console.log(`\n${failures} target(s) failed or skipped.`);
    process.exit(1);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Discovery failed:", err);
  process.exit(1);
});
