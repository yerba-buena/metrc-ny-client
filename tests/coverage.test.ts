import { describe, it, expect } from "vitest";
import { CLIENT_COVERAGE, type ResourceCoverage } from "../src/coverage.js";

describe("CLIENT_COVERAGE", () => {
  it("is a frozen, non-empty array", () => {
    expect(Array.isArray(CLIENT_COVERAGE)).toBe(true);
    expect(CLIENT_COVERAGE.length).toBeGreaterThan(0);
    expect(Object.isFrozen(CLIENT_COVERAGE)).toBe(true);
  });

  it("contains expected resource families", () => {
    const names = CLIENT_COVERAGE.map((r) => r.resource);
    expect(names).toEqual(expect.arrayContaining([
      "transfers", "packages", "locations", "items", "sales",
      "sublocations", "strains", "labtests", "unitsofmeasure",
      "facilities", "employees", "tags", "wastemethods", "retailid",
    ]));
  });

  it("declares all five implemented transfers endpoints as complete", () => {
    const transfers = CLIENT_COVERAGE.find((r) => r.resource === "transfers")!;
    const byPath = Object.fromEntries(transfers.endpoints.map(e => [e.path, e]));
    expect(byPath["/transfers/v2/incoming"]?.status).toBe("complete");
    expect(byPath["/transfers/v2/incoming"]?.clientMethod).toBe("getIncomingTransfers");
    expect(byPath["/transfers/v2/deliveries/{id}/packages"]?.status).toBe("complete");
    expect(byPath["/transfers/v2/deliveries/{id}/packages"]?.clientMethod).toBe("getPackagesForDelivery");
    expect(byPath["/transfers/v2/outgoing"]?.status).toBe("complete");
    expect(byPath["/transfers/v2/outgoing"]?.clientMethod).toBe("getOutgoingTransfers");
    expect(byPath["/transfers/v2/rejected"]?.status).toBe("complete");
    expect(byPath["/transfers/v2/rejected"]?.clientMethod).toBe("getRejectedTransfers");
    expect(byPath["/transfers/v2/types"]?.status).toBe("complete");
    expect(byPath["/transfers/v2/types"]?.clientMethod).toBe("getTransferTypes");
  });

  it("does not contain the removed /transfers/v2/{id} entry", () => {
    // /transfers/v2/{id} was removed — it does not exist in the METRC NY v2 docs.
    // The conceptual replacement /transfers/v2/{id}/deliveries is listed as planned.
    const transfers = CLIENT_COVERAGE.find((r) => r.resource === "transfers")!;
    const byId = transfers.endpoints.find((e) => e.path === "/transfers/v2/{id}");
    expect(byId).toBeUndefined();
  });

  it("lists /transfers/v2/{id}/deliveries as planned (401 during live probe — likely vendor/scope-restricted)", () => {
    const transfers = CLIENT_COVERAGE.find((r) => r.resource === "transfers")!;
    const byPath = Object.fromEntries(transfers.endpoints.map(e => [e.path, e]));
    expect(byPath["/transfers/v2/{id}/deliveries"]?.status).toBe("planned");
    expect(byPath["/transfers/v2/{id}/deliveries"]?.clientMethod).toBeNull();
  });

  it("lists transfers expansion endpoints as planned", () => {
    const transfers = CLIENT_COVERAGE.find((r) => r.resource === "transfers")!;
    const byPath = Object.fromEntries(transfers.endpoints.map(e => [e.path, e]));
    const plannedPaths = [
      "/transfers/v2/hub",
      "/transfers/v2/deliveries/{id}/transporters",
      "/transfers/v2/deliveries/{id}/transporters/details",
      "/transfers/v2/deliveries/{id}/packages/wholesale",
      "/transfers/v2/deliveries/package/{id}/requiredlabtestbatches",
      "/transfers/v2/deliveries/packages/states",
      "/transfers/v2/templates/outgoing",
      "/transfers/v2/templates/outgoing/{id}/deliveries",
      "/transfers/v2/templates/outgoing/deliveries/{id}/transporters",
      "/transfers/v2/templates/outgoing/deliveries/{id}/transporters/details",
      "/transfers/v2/templates/outgoing/deliveries/{id}/packages",
      "/transfers/v2/manifest/{id}/pdf",
    ];
    for (const p of plannedPaths) {
      expect(byPath[p]?.status, `${p} should be planned`).toBe("planned");
    }
  });

  it("keeps transfers resource status as partial (5 complete, many planned)", () => {
    const transfers = CLIENT_COVERAGE.find((r) => r.resource === "transfers")!;
    expect(transfers.status).toBe("partial");
  });

  it("flags transfers as hasWrites: true", () => {
    const transfers = CLIENT_COVERAGE.find((r) => r.resource === "transfers")!;
    expect(transfers.hasWrites).toBe(true);
  });

  it("lists getDeliveriesWithPackages as a transfers-resource helper composing two API methods", () => {
    const transfers = CLIENT_COVERAGE.find((r) => r.resource === "transfers")!;
    const helper = transfers.helpers?.find((h) => h.name === "getDeliveriesWithPackages");
    expect(helper).toBeDefined();
    expect(helper!.composes).toEqual(
      expect.arrayContaining(["getIncomingTransfers", "getPackagesForDelivery"]),
    );
  });

  it("lists every packages endpoint that landed in phase 2 as complete", () => {
    const packages = CLIENT_COVERAGE.find((r) => r.resource === "packages")!;
    const byPath = Object.fromEntries(packages.endpoints.map(e => [e.path, e]));
    expect(byPath["/packages/v2/active"]?.clientMethod).toBe("getActivePackages");
    expect(byPath["/packages/v2/active"]?.status).toBe("complete");
    expect(byPath["/packages/v2/inactive"]?.clientMethod).toBe("getInactivePackages");
    expect(byPath["/packages/v2/inactive"]?.status).toBe("complete");
    expect(byPath["/packages/v2/onhold"]?.clientMethod).toBe("getOnHoldPackages");
    expect(byPath["/packages/v2/onhold"]?.status).toBe("complete");
    expect(byPath["/packages/v2/types"]?.clientMethod).toBe("getPackageTypes");
    expect(byPath["/packages/v2/types"]?.status).toBe("complete");
    expect(byPath["/packages/v2/adjust/reasons"]?.clientMethod).toBe("getPackageAdjustReasons");
    expect(byPath["/packages/v2/adjust/reasons"]?.status).toBe("complete");
    expect(byPath["/packages/v2/{id}"]?.clientMethod).toBe("getPackageById");
    expect(byPath["/packages/v2/{id}"]?.status).toBe("complete");
    expect(byPath["/packages/v2/{label}"]?.clientMethod).toBe("getPackageByLabel");
    expect(byPath["/packages/v2/{label}"]?.status).toBe("complete");
  });

  it("does not contain the removed /packages/v2/{id}/history entry (URL confirmed not to exist; use /packages/v2/adjustments instead)", () => {
    const packages = CLIENT_COVERAGE.find((r) => r.resource === "packages")!;
    const history = packages.endpoints.find((e) => e.path === "/packages/v2/{id}/history");
    expect(history).toBeUndefined();
  });

  it("lists every packages expansion endpoint from phase 6 as complete", () => {
    const packages = CLIENT_COVERAGE.find((r) => r.resource === "packages")!;
    const byPath = Object.fromEntries(packages.endpoints.map(e => [e.path, e]));
    expect(byPath["/packages/v2/adjustments"]?.status).toBe("complete");
    expect(byPath["/packages/v2/adjustments"]?.clientMethod).toBe("getPackageAdjustments");
    expect(byPath["/packages/v2/transferred"]?.status).toBe("complete");
    expect(byPath["/packages/v2/transferred"]?.clientMethod).toBe("getTransferredPackages");
    expect(byPath["/packages/v2/intransit"]?.status).toBe("complete");
    expect(byPath["/packages/v2/intransit"]?.clientMethod).toBe("getInTransitPackages");
    expect(byPath["/packages/v2/labsamples"]?.status).toBe("complete");
    expect(byPath["/packages/v2/labsamples"]?.clientMethod).toBe("getLabSamplePackages");
    expect(byPath["/packages/v2/{id}/source/harvests"]?.status).toBe("complete");
    expect(byPath["/packages/v2/{id}/source/harvests"]?.clientMethod).toBe("getPackageSourceHarvests");
  });

  it("marks packages resource as complete (12 of 12 documented endpoints done)", () => {
    // Phase 6 completes the last 5 endpoints: adjustments, transferred, intransit, labsamples, source/harvests.
    // All 12 documented endpoints (active, inactive, onhold, types, adjust/reasons, by-id, by-label,
    // adjustments, transferred, intransit, labsamples, source/harvests) are now complete.
    const packages = CLIENT_COVERAGE.find((r) => r.resource === "packages")!;
    expect(packages.status).toBe("complete");
  });

  it("lists groupByLocation and siteSnapshot under packages.helpers", () => {
    const packages = CLIENT_COVERAGE.find((r) => r.resource === "packages")!;
    const helperNames = (packages.helpers ?? []).map(h => h.name).sort();
    expect(helperNames).toEqual(["groupByLocation", "siteSnapshot"]);
    const siteSnap = packages.helpers?.find(h => h.name === "siteSnapshot")!;
    expect(siteSnap.composes).toEqual(expect.arrayContaining([
      "getActiveLocations", "getActivePackages", "getInactivePackages", "getOnHoldPackages",
    ]));
  });

  it("lists locations expansion endpoints (inactive, {id}, types) as complete", () => {
    const locations = CLIENT_COVERAGE.find((r) => r.resource === "locations")!;
    const byPath = Object.fromEntries(locations.endpoints.map(e => [e.path, e]));
    expect(byPath["/locations/v2/active"]?.status).toBe("complete");
    expect(byPath["/locations/v2/{id}"]?.status).toBe("complete");
    expect(byPath["/locations/v2/inactive"]?.status).toBe("complete");
    expect(byPath["/locations/v2/types"]?.status).toBe("complete");
  });

  it("lists sublocations resource as complete with 3 endpoints", () => {
    const sublocations = CLIENT_COVERAGE.find((r) => r.resource === "sublocations");
    expect(sublocations).toBeDefined();
    expect(sublocations!.status).toBe("complete");
    expect(sublocations!.endpoints).toHaveLength(3);
    const paths = sublocations!.endpoints.map(e => e.path);
    expect(paths).toEqual(expect.arrayContaining([
      "/sublocations/v2/{id}",
      "/sublocations/v2/active",
      "/sublocations/v2/inactive",
    ]));
  });

  it("declares both original items endpoints as complete and tied to their client methods", () => {
    const items = CLIENT_COVERAGE.find((r) => r.resource === "items")!;
    const active = items.endpoints.find((e) => e.path === "/items/v2/active");
    const categories = items.endpoints.find((e) => e.path === "/items/v2/categories");
    expect(active?.status).toBe("complete");
    expect(active?.clientMethod).toBe("getActiveItems");
    expect(categories?.status).toBe("complete");
    expect(categories?.clientMethod).toBe("getItemCategories");
  });

  it("marks items resource as partial (spec underestimated — 5 new planned endpoints added)", () => {
    // Items was previously complete at 2/2. Now that {id}/inactive/brands/photo/file
    // are enumerated as planned, it moves back to partial. That is correct.
    const items = CLIENT_COVERAGE.find((r) => r.resource === "items")!;
    expect(items.status).toBe("partial");
  });

  it("lists items expansion endpoints as planned", () => {
    const items = CLIENT_COVERAGE.find((r) => r.resource === "items")!;
    const byPath = Object.fromEntries(items.endpoints.map(e => [e.path, e]));
    const plannedPaths = [
      "/items/v2/{id}",
      "/items/v2/inactive",
      "/items/v2/brands",
      "/items/v2/photo/{id}",
      "/items/v2/file/{id}",
    ];
    for (const p of plannedPaths) {
      expect(byPath[p]?.status, `${p} should be planned`).toBe("planned");
    }
  });

  it("lists strains resource with 3 complete endpoints (including inactive)", () => {
    const strains = CLIENT_COVERAGE.find((r) => r.resource === "strains");
    expect(strains).toBeDefined();
    expect(strains!.status).toBe("complete");
    const byPath = Object.fromEntries(strains!.endpoints.map(e => [e.path, e]));
    expect(byPath["/strains/v2/{id}"]?.status).toBe("complete");
    expect(byPath["/strains/v2/active"]?.status).toBe("complete");
    expect(byPath["/strains/v2/inactive"]?.status).toBe("complete");
  });

  it("declares sales receipts list, detail, and customertypes endpoints as complete", () => {
    const sales = CLIENT_COVERAGE.find((r) => r.resource === "sales")!;
    const byPath = Object.fromEntries(sales.endpoints.map(e => [e.path, e]));
    expect(byPath["/sales/v2/receipts/active"]?.status).toBe("complete");
    expect(byPath["/sales/v2/receipts/active"]?.clientMethod).toBe("getActiveSalesReceipts");
    expect(byPath["/sales/v2/receipts/{id}"]?.status).toBe("complete");
    expect(byPath["/sales/v2/receipts/{id}"]?.clientMethod).toBe("getSalesReceiptById");
    expect(byPath["/sales/v2/customertypes"]?.status).toBe("complete");
    expect(byPath["/sales/v2/customertypes"]?.clientMethod).toBe("getSalesCustomerTypes");
  });

  it("does not contain the removed /sales/v2/transactions entry (URL confirmed not to exist in METRC NY v2 docs)", () => {
    // Per docs review 2026-06-10: /sales/v2/transactions does not exist.
    // Per-transaction data is accessible via getSalesReceiptById(id).Transactions.
    const sales = CLIENT_COVERAGE.find((r) => r.resource === "sales")!;
    const transactions = sales.endpoints.find((e) => e.path === "/sales/v2/transactions");
    expect(transactions).toBeUndefined();
  });

  it("lists sales expansion endpoints as planned", () => {
    const sales = CLIENT_COVERAGE.find((r) => r.resource === "sales")!;
    const byPath = Object.fromEntries(sales.endpoints.map(e => [e.path, e]));
    const plannedPaths = [
      "/sales/v2/patientregistration/locations",
      "/sales/v2/deliveries/{id}",
      "/sales/v2/deliveries/active",
      "/sales/v2/deliveries/inactive",
      "/sales/v2/deliveries/returnreasons",
      "/sales/v2/counties",
      "/sales/v2/paymenttypes",
      "/sales/v2/receipts/external/{externalNumber}",
      "/sales/v2/receipts/inactive",
      "/sales/v2/deliveries/retailer/active",
      "/sales/v2/deliveries/retailer/inactive",
      "/sales/v2/deliveries/retailer/{id}",
    ];
    for (const p of plannedPaths) {
      expect(byPath[p]?.status, `${p} should be planned`).toBe("planned");
    }
  });

  it("keeps sales resource status as partial", () => {
    const sales = CLIENT_COVERAGE.find((r) => r.resource === "sales")!;
    expect(sales.status).toBe("partial");
  });

  it("lists labtests resource with 5 planned endpoints including batches and labtestdocument", () => {
    const labtests = CLIENT_COVERAGE.find((r) => r.resource === "labtests");
    expect(labtests).toBeDefined();
    expect(labtests!.status).toBe("planned");
    const byPath = Object.fromEntries(labtests!.endpoints.map(e => [e.path, e]));
    expect(byPath["/labtests/v2/states"]?.status).toBe("planned");
    expect(byPath["/labtests/v2/batches"]?.status).toBe("planned");
    expect(byPath["/labtests/v2/types"]?.status).toBe("planned");
    expect(byPath["/labtests/v2/results"]?.status).toBe("planned");
    expect(byPath["/labtests/v2/labtestdocument/{id}"]?.status).toBe("planned");
  });

  it("lists unitsofmeasure, facilities, employees, tags, wastemethods, retailid as planned", () => {
    const expected: [string, number][] = [
      ["unitsofmeasure", 2],
      ["facilities", 1],
      ["employees", 2],
      ["tags", 3],
      ["wastemethods", 1],
      ["retailid", 3],
    ];
    for (const [name, endpointCount] of expected) {
      const resource = CLIENT_COVERAGE.find((r) => r.resource === name);
      expect(resource, `${name} should be in CLIENT_COVERAGE`).toBeDefined();
      expect(resource!.status, `${name} should be planned`).toBe("planned");
      expect(resource!.endpoints, `${name} should have ${endpointCount} endpoint(s)`).toHaveLength(endpointCount);
    }
  });

  it("lists patients, caregivers, patient-checkins as out-of-scope-for-now (medical-program)", () => {
    const medicalResources = ["patients", "caregivers", "patient-checkins"];
    for (const name of medicalResources) {
      const resource = CLIENT_COVERAGE.find((r) => r.resource === name);
      expect(resource, `${name} should be in CLIENT_COVERAGE`).toBeDefined();
      expect(resource!.status, `${name} should be out-of-scope-for-now`).toBe("out-of-scope-for-now");
      expect(resource!.endpoints.length, `${name} should have enumerated endpoints`).toBeGreaterThan(0);
      for (const endpoint of resource!.endpoints) {
        expect(endpoint.status).toBe("out-of-scope-for-now");
      }
    }
  });

  it("marks plants/plantbatches/harvests as out-of-scope-for-now with enumerated endpoints", () => {
    const cultivatorResources = ["plants", "plantbatches", "harvests"];
    for (const name of cultivatorResources) {
      const entry = CLIENT_COVERAGE.find((r) => r.resource === name);
      expect(entry, `resource ${name} should appear in CLIENT_COVERAGE as out-of-scope-for-now`).toBeDefined();
      expect(entry!.status).toBe("out-of-scope-for-now");
      expect(entry!.endpoints.length, `${name} should have enumerated endpoints`).toBeGreaterThan(0);
    }
  });

  it("marks processing and additivestemplates as out-of-scope-for-now (cultivator-side)", () => {
    const newCultivatorResources = ["processing", "additivestemplates"];
    for (const name of newCultivatorResources) {
      const entry = CLIENT_COVERAGE.find((r) => r.resource === name);
      expect(entry, `resource ${name} should appear in CLIENT_COVERAGE`).toBeDefined();
      expect(entry!.status).toBe("out-of-scope-for-now");
    }
  });

  it("no longer has a 'waste' resource entry (replaced by separate wastemethods + cultivator waste entries)", () => {
    // The old 'waste' entry with empty endpoints has been removed.
    // wastemethods (/wastemethods/v2/) is a separate planned resource.
    // Cultivator-side waste tracking is documented under plants/harvests endpoints.
    const waste = CLIENT_COVERAGE.find((r) => r.resource === "waste");
    expect(waste).toBeUndefined();
  });

  it("uses only the four allowed status values", () => {
    const allowed = new Set<ResourceCoverage["status"]>(["complete", "partial", "planned", "out-of-scope-for-now"]);
    for (const resource of CLIENT_COVERAGE) {
      expect(allowed.has(resource.status)).toBe(true);
      for (const endpoint of resource.endpoints) {
        expect(allowed.has(endpoint.status)).toBe(true);
      }
    }
  });

  it("all planned resource entries have only planned or complete endpoints (no out-of-scope in planned resources)", () => {
    const plannedResources = CLIENT_COVERAGE.filter((r) => r.status === "planned");
    for (const resource of plannedResources) {
      for (const endpoint of resource.endpoints) {
        expect(
          endpoint.status === "planned" || endpoint.status === "complete",
          `${resource.resource}/${endpoint.path} in a planned resource should be planned or complete, got ${endpoint.status}`,
        ).toBe(true);
      }
    }
  });

  it("marks locations resource as complete (active + types + inactive + by-id all done)", () => {
    const locations = CLIENT_COVERAGE.find((r) => r.resource === "locations")!;
    expect(locations.status).toBe("complete");
    const byPath = Object.fromEntries(locations.endpoints.map(e => [e.path, e]));
    expect(byPath["/locations/v2/active"]?.clientMethod).toBe("getActiveLocations");
    expect(byPath["/locations/v2/active"]?.status).toBe("complete");
    expect(byPath["/locations/v2/types"]?.clientMethod).toBe("getLocationTypes");
    expect(byPath["/locations/v2/types"]?.status).toBe("complete");
    expect(byPath["/locations/v2/inactive"]?.clientMethod).toBe("getInactiveLocations");
    expect(byPath["/locations/v2/inactive"]?.status).toBe("complete");
    expect(byPath["/locations/v2/{id}"]?.clientMethod).toBe("getLocationById");
    expect(byPath["/locations/v2/{id}"]?.status).toBe("complete");
  });

  it("marks sublocations resource as complete", () => {
    const sublocations = CLIENT_COVERAGE.find((r) => r.resource === "sublocations")!;
    expect(sublocations.status).toBe("complete");
    const byPath = Object.fromEntries(sublocations.endpoints.map(e => [e.path, e]));
    expect(byPath["/sublocations/v2/active"]?.clientMethod).toBe("getActiveSublocations");
    expect(byPath["/sublocations/v2/active"]?.status).toBe("complete");
    expect(byPath["/sublocations/v2/inactive"]?.clientMethod).toBe("getInactiveSublocations");
    expect(byPath["/sublocations/v2/inactive"]?.status).toBe("complete");
    expect(byPath["/sublocations/v2/{id}"]?.clientMethod).toBe("getSublocationById");
    expect(byPath["/sublocations/v2/{id}"]?.status).toBe("complete");
  });

  it("marks strains resource as complete", () => {
    const strains = CLIENT_COVERAGE.find((r) => r.resource === "strains")!;
    expect(strains.status).toBe("complete");
    const byPath = Object.fromEntries(strains.endpoints.map(e => [e.path, e]));
    expect(byPath["/strains/v2/active"]?.clientMethod).toBe("getActiveStrains");
    expect(byPath["/strains/v2/active"]?.status).toBe("complete");
    expect(byPath["/strains/v2/inactive"]?.clientMethod).toBe("getInactiveStrains");
    expect(byPath["/strains/v2/inactive"]?.status).toBe("complete");
    expect(byPath["/strains/v2/{id}"]?.clientMethod).toBe("getStrainById");
    expect(byPath["/strains/v2/{id}"]?.status).toBe("complete");
  });
});
