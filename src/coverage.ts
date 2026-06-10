/**
 * Enhancement: typed, programmatic map of which METRC NY v2 endpoints
 * this client covers and at what level. Not a METRC API surface — this
 * is a client-side introspection artifact for downstream consumers
 * that want to ask "is endpoint X supported?" without scraping the
 * README. Kept in lockstep with the Coverage table in README.md.
 *
 * `hasWrites` on a ResourceCoverage entry signals that documented
 * write operations (POST/PUT/DELETE) exist for this resource family.
 * All writes are out-of-scope-for-now — tracked under issues #6
 * (transfers receive), #7 (packages create/adjust), and #8 (sales
 * record). The flag is informational; no write methods are implemented.
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
  /** True if METRC documents POST/PUT/DELETE operations for this resource. All writes are out-of-scope-for-now. */
  hasWrites?: boolean;
  endpoints: readonly EndpointCoverage[];
  helpers?: readonly HelperCoverage[];
}

export const CLIENT_COVERAGE: readonly ResourceCoverage[] = Object.freeze([
  // ── transfers ────────────────────────────────────────────────────────────
  Object.freeze({
    resource: "transfers",
    status: "partial" as const,
    hasWrites: true,
    endpoints: [
      { path: "/transfers/v2/incoming", method: "GET" as const, clientMethod: "getIncomingTransfers", status: "complete" as const },
      { path: "/transfers/v2/deliveries/{id}/packages", method: "GET" as const, clientMethod: "getPackagesForDelivery", status: "complete" as const },
      { path: "/transfers/v2/outgoing", method: "GET" as const, clientMethod: "getOutgoingTransfers", status: "complete" as const },
      { path: "/transfers/v2/rejected", method: "GET" as const, clientMethod: "getRejectedTransfers", status: "complete" as const },
      { path: "/transfers/v2/types", method: "GET" as const, clientMethod: "getTransferTypes", status: "complete" as const },
      { path: "/transfers/v2/hub", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/{id}/deliveries", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/deliveries/{id}/transporters", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/deliveries/{id}/transporters/details", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/deliveries/{id}/packages/wholesale", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/deliveries/package/{id}/requiredlabtestbatches", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/deliveries/packages/states", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/templates/outgoing", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/templates/outgoing/{id}/deliveries", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/templates/outgoing/deliveries/{id}/transporters", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/templates/outgoing/deliveries/{id}/transporters/details", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/templates/outgoing/deliveries/{id}/packages", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/transfers/v2/manifest/{id}/pdf", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
    helpers: [
      { name: "getDeliveriesWithPackages", composes: ["getIncomingTransfers", "getPackagesForDelivery"] },
    ],
  } as const),

  // ── packages ─────────────────────────────────────────────────────────────
  Object.freeze({
    resource: "packages",
    status: "partial" as const,
    hasWrites: true,
    endpoints: [
      { path: "/packages/v2/active", method: "GET" as const, clientMethod: "getActivePackages", status: "complete" as const },
      { path: "/packages/v2/inactive", method: "GET" as const, clientMethod: "getInactivePackages", status: "complete" as const },
      { path: "/packages/v2/onhold", method: "GET" as const, clientMethod: "getOnHoldPackages", status: "complete" as const },
      { path: "/packages/v2/types", method: "GET" as const, clientMethod: "getPackageTypes", status: "complete" as const },
      { path: "/packages/v2/adjust/reasons", method: "GET" as const, clientMethod: "getPackageAdjustReasons", status: "complete" as const },
      { path: "/packages/v2/{id}", method: "GET" as const, clientMethod: "getPackageById", status: "complete" as const },
      { path: "/packages/v2/{label}", method: "GET" as const, clientMethod: "getPackageByLabel", status: "complete" as const },
      { path: "/packages/v2/intransit", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/packages/v2/labsamples", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/packages/v2/adjustments", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/packages/v2/{id}/source/harvests", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/packages/v2/transferred", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
    helpers: [
      { name: "groupByLocation", composes: ["(pure helper over MetrcActivePackage[])"] },
      { name: "siteSnapshot", composes: ["getActiveLocations", "getActivePackages", "getInactivePackages", "getOnHoldPackages"] },
    ],
  } as const),

  // ── locations ─────────────────────────────────────────────────────────────
  Object.freeze({
    resource: "locations",
    status: "partial" as const,
    hasWrites: true,
    endpoints: [
      { path: "/locations/v2/active", method: "GET" as const, clientMethod: "getActiveLocations", status: "complete" as const },
      { path: "/locations/v2/{id}", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/locations/v2/inactive", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/locations/v2/types", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── sublocations ──────────────────────────────────────────────────────────
  Object.freeze({
    resource: "sublocations",
    status: "planned" as const,
    hasWrites: true,
    endpoints: [
      { path: "/sublocations/v2/{id}", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sublocations/v2/active", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sublocations/v2/inactive", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── items ─────────────────────────────────────────────────────────────────
  Object.freeze({
    resource: "items",
    status: "partial" as const,
    hasWrites: true,
    endpoints: [
      { path: "/items/v2/active", method: "GET" as const, clientMethod: "getActiveItems", status: "complete" as const },
      { path: "/items/v2/categories", method: "GET" as const, clientMethod: "getItemCategories", status: "complete" as const },
      { path: "/items/v2/{id}", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/items/v2/inactive", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/items/v2/brands", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/items/v2/photo/{id}", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/items/v2/file/{id}", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── strains ───────────────────────────────────────────────────────────────
  Object.freeze({
    resource: "strains",
    status: "planned" as const,
    hasWrites: true,
    endpoints: [
      { path: "/strains/v2/{id}", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/strains/v2/active", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/strains/v2/inactive", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── sales ─────────────────────────────────────────────────────────────────
  Object.freeze({
    resource: "sales",
    status: "partial" as const,
    hasWrites: true,
    endpoints: [
      { path: "/sales/v2/receipts/active", method: "GET" as const, clientMethod: "getActiveSalesReceipts", status: "complete" as const },
      { path: "/sales/v2/receipts/{id}", method: "GET" as const, clientMethod: "getSalesReceiptById", status: "complete" as const },
      { path: "/sales/v2/customertypes", method: "GET" as const, clientMethod: "getSalesCustomerTypes", status: "complete" as const },
      { path: "/sales/v2/patientregistration/locations", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sales/v2/deliveries/{id}", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sales/v2/deliveries/active", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sales/v2/deliveries/inactive", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sales/v2/deliveries/returnreasons", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sales/v2/counties", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sales/v2/paymenttypes", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sales/v2/receipts/external/{externalNumber}", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sales/v2/receipts/inactive", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sales/v2/deliveries/retailer/active", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sales/v2/deliveries/retailer/inactive", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/sales/v2/deliveries/retailer/{id}", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── labtests ──────────────────────────────────────────────────────────────
  Object.freeze({
    resource: "labtests",
    status: "planned" as const,
    endpoints: [
      { path: "/labtests/v2/states", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/labtests/v2/batches", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/labtests/v2/types", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/labtests/v2/results", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/labtests/v2/labtestdocument/{id}", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── unitsofmeasure ────────────────────────────────────────────────────────
  Object.freeze({
    resource: "unitsofmeasure",
    status: "planned" as const,
    endpoints: [
      { path: "/unitsofmeasure/v2/active", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/unitsofmeasure/v2/inactive", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── facilities ────────────────────────────────────────────────────────────
  Object.freeze({
    resource: "facilities",
    status: "planned" as const,
    endpoints: [
      { path: "/facilities/v2/", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── employees ─────────────────────────────────────────────────────────────
  Object.freeze({
    resource: "employees",
    status: "planned" as const,
    endpoints: [
      { path: "/employees/v2/", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/employees/v2/permissions", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── tags ──────────────────────────────────────────────────────────────────
  Object.freeze({
    resource: "tags",
    status: "planned" as const,
    endpoints: [
      { path: "/tags/v2/plant/available", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/tags/v2/package/available", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/tags/v2/staged", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── wastemethods ──────────────────────────────────────────────────────────
  Object.freeze({
    resource: "wastemethods",
    status: "planned" as const,
    endpoints: [
      { path: "/wastemethods/v2/", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── retailid ──────────────────────────────────────────────────────────────
  Object.freeze({
    resource: "retailid",
    status: "planned" as const,
    endpoints: [
      { path: "/retailid/v2/allotment", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/retailid/v2/receive/{label}", method: "GET" as const, clientMethod: null, status: "planned" as const },
      { path: "/retailid/v2/receive/qr/{shortCode}", method: "GET" as const, clientMethod: null, status: "planned" as const },
    ] as const,
  } as const),

  // ── patients (medical-program) ────────────────────────────────────────────
  // Medical marijuana program endpoints; not used by adult-use retail
  // dispensary licenses. May be re-scoped if YBAM ever holds a medical license.
  Object.freeze({
    resource: "patients",
    status: "out-of-scope-for-now" as const,
    endpoints: [
      { path: "/patients/v2/{id}", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/patients/v2/active", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/patients/v2/statuses/{patientLicenseNumber}", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
    ] as const,
  } as const),

  // ── caregivers (medical-program) ──────────────────────────────────────────
  // Medical marijuana program endpoints; not used by adult-use retail
  // dispensary licenses. May be re-scoped if YBAM ever holds a medical license.
  Object.freeze({
    resource: "caregivers",
    status: "out-of-scope-for-now" as const,
    endpoints: [
      { path: "/caregivers/v2/status/{caregiverLicenseNumber}", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
    ] as const,
  } as const),

  // ── patient-checkins (medical-program) ────────────────────────────────────
  // Medical marijuana program endpoints; not used by adult-use retail
  // dispensary licenses. May be re-scoped if YBAM ever holds a medical license.
  Object.freeze({
    resource: "patient-checkins",
    status: "out-of-scope-for-now" as const,
    endpoints: [
      { path: "/patient-checkins/v2/locations", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/patient-checkins/v2/", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
    ] as const,
  } as const),

  // ── plants (cultivator-side) ──────────────────────────────────────────────
  // Cultivator-side resource; we lack a cultivator license for live verification.
  // Issue #2. Endpoints enumerated for completeness.
  Object.freeze({
    resource: "plants",
    status: "out-of-scope-for-now" as const,
    hasWrites: true,
    endpoints: [
      { path: "/plants/v2/{id}", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/plants/v2/vegetative", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/plants/v2/flowering", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/plants/v2/onhold", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/plants/v2/inactive", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/plants/v2/additives/types", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/plants/v2/growthphases", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/plants/v2/waste/methods", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/plants/v2/waste/reasons", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
    ] as const,
  } as const),

  // ── plantbatches (cultivator-side) ────────────────────────────────────────
  // Cultivator-side resource; we lack a cultivator license for live verification.
  // Issue #3. Endpoints enumerated for completeness.
  Object.freeze({
    resource: "plantbatches",
    status: "out-of-scope-for-now" as const,
    hasWrites: true,
    endpoints: [
      { path: "/plantbatches/v2/{id}", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/plantbatches/v2/active", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/plantbatches/v2/inactive", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/plantbatches/v2/types", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
    ] as const,
  } as const),

  // ── harvests (cultivator-side) ────────────────────────────────────────────
  // Cultivator-side resource; we lack a cultivator license for live verification.
  // Issue #4. Endpoints enumerated for completeness.
  Object.freeze({
    resource: "harvests",
    status: "out-of-scope-for-now" as const,
    hasWrites: true,
    endpoints: [
      { path: "/harvests/v2/{id}", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/harvests/v2/active", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/harvests/v2/onhold", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/harvests/v2/inactive", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/harvests/v2/waste/types", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
    ] as const,
  } as const),

  // ── processing (cultivator-side) ──────────────────────────────────────────
  // Cultivator-side processing-jobs resource; not exposed by our retail license.
  // No separate issue filed; tracked under existing cultivator issues (#2–#5).
  Object.freeze({
    resource: "processing",
    status: "out-of-scope-for-now" as const,
    hasWrites: true,
    endpoints: [
      { path: "/processing/v2/{id}", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/processing/v2/active", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/processing/v2/inactive", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/processing/v2/types", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
    ] as const,
  } as const),

  // ── additivestemplates (cultivator-side) ──────────────────────────────────
  // Cultivator-side resource; not exposed by our retail license.
  // Tracked under existing cultivator issues (#2–#5).
  Object.freeze({
    resource: "additivestemplates",
    status: "out-of-scope-for-now" as const,
    hasWrites: true,
    endpoints: [
      { path: "/additivestemplates/v2/{id}", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/additivestemplates/v2/active", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
      { path: "/additivestemplates/v2/inactive", method: "GET" as const, clientMethod: null, status: "out-of-scope-for-now" as const },
    ] as const,
  } as const),
]);
