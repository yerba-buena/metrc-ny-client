/**
 * Enhancement: typed, programmatic map of which METRC NY v2 endpoints
 * this client covers and at what level. Not a METRC API surface — this
 * is a client-side introspection artifact for downstream consumers
 * that want to ask "is endpoint X supported?" without scraping the
 * README. Kept in lockstep with the Coverage table in README.md.
 */

export type CoverageStatus = "complete" | "partial" | "planned" | "out-of-scope-for-now";

export interface EndpointCoverage {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  clientMethod: string | null;
  status: CoverageStatus;
}

export interface HelperCoverage {
  name: string;
  composes: readonly string[];
}

export interface ResourceCoverage {
  resource: string;
  status: CoverageStatus;
  endpoints: readonly EndpointCoverage[];
  helpers?: readonly HelperCoverage[];
}

export const CLIENT_COVERAGE: readonly ResourceCoverage[] = Object.freeze([
  Object.freeze({
    resource: "transfers",
    status: "partial" as const,
    endpoints: [
      { path: "/transfers/v2/incoming", method: "GET" as const, clientMethod: "getIncomingTransfers", status: "complete" as const },
      { path: "/transfers/v2/deliveries/{id}/packages", method: "GET" as const, clientMethod: "getPackagesForDelivery", status: "complete" as const },
      { path: "/transfers/v2/outgoing", method: "GET" as const, clientMethod: "getOutgoingTransfers", status: "complete" as const },
      { path: "/transfers/v2/rejected", method: "GET" as const, clientMethod: "getRejectedTransfers", status: "complete" as const },
      { path: "/transfers/v2/types", method: "GET" as const, clientMethod: "getTransferTypes", status: "complete" as const },
      { path: "/transfers/v2/{id}", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
    ] as const,
    helpers: [
      { name: "getDeliveriesWithPackages", composes: ["getIncomingTransfers", "getPackagesForDelivery"] },
    ],
  } as const),
  Object.freeze({
    resource: "packages",
    status: "complete" as const,
    endpoints: [
      { path: "/packages/v2/active", method: "GET" as const, clientMethod: "getActivePackages", status: "complete" as const },
      { path: "/packages/v2/inactive", method: "GET" as const, clientMethod: "getInactivePackages", status: "complete" as const },
      { path: "/packages/v2/onhold", method: "GET" as const, clientMethod: "getOnHoldPackages", status: "complete" as const },
      { path: "/packages/v2/types", method: "GET" as const, clientMethod: "getPackageTypes", status: "complete" as const },
      { path: "/packages/v2/adjust/reasons", method: "GET" as const, clientMethod: "getPackageAdjustReasons", status: "complete" as const },
      { path: "/packages/v2/{id}", method: "GET" as const, clientMethod: "getPackageById", status: "complete" as const },
      { path: "/packages/v2/{label}", method: "GET" as const, clientMethod: "getPackageByLabel", status: "complete" as const },
      { path: "/packages/v2/{id}/history", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
    ] as const,
    helpers: [
      { name: "groupByLocation", composes: ["(pure helper over MetrcActivePackage[])"] },
      { name: "siteSnapshot", composes: ["getActiveLocations", "getActivePackages", "getInactivePackages", "getOnHoldPackages"] },
    ],
  } as const),
  Object.freeze({
    resource: "locations",
    status: "partial" as const,
    endpoints: [
      { path: "/locations/v2/active", method: "GET" as const, clientMethod: "getActiveLocations", status: "complete" as const },
      { path: "/locations/v2/types", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),
  Object.freeze({
    resource: "items",
    status: "complete" as const,
    endpoints: [
      { path: "/items/v2/active", method: "GET" as const, clientMethod: "getActiveItems", status: "complete" as const },
      { path: "/items/v2/categories", method: "GET" as const, clientMethod: "getItemCategories", status: "complete" as const },
    ] as const,
  } as const),
  Object.freeze({
    resource: "sales",
    status: "partial" as const,
    endpoints: [
      { path: "/sales/v2/receipts/active", method: "GET" as const, clientMethod: "getActiveSalesReceipts", status: "complete" as const },
      { path: "/sales/v2/receipts/{id}", method: "GET" as const, clientMethod: "getSalesReceiptById", status: "complete" as const },
      { path: "/sales/v2/transactions", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/sales/v2/customertypes", method: "GET" as const, clientMethod: "getSalesCustomerTypes", status: "complete" as const },
    ] as const,
  } as const),
  Object.freeze({
    resource: "strains",
    status: "planned" as const,
    endpoints: [
      { path: "/strains/v2/active", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/strains/v2/{id}", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),
  Object.freeze({
    resource: "labtests",
    status: "planned" as const,
    endpoints: [
      { path: "/labtests/v2/results", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/labtests/v2/states", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/labtests/v2/types", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/labtests/v2/{id}", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),
  Object.freeze({
    resource: "plants",
    status: "out-of-scope-for-now" as const,
    endpoints: [] as const,
  } as const),
  Object.freeze({
    resource: "plantbatches",
    status: "out-of-scope-for-now" as const,
    endpoints: [] as const,
  } as const),
  Object.freeze({
    resource: "harvests",
    status: "out-of-scope-for-now" as const,
    endpoints: [] as const,
  } as const),
  Object.freeze({
    resource: "waste",
    status: "out-of-scope-for-now" as const,
    endpoints: [] as const,
  } as const),
]);
