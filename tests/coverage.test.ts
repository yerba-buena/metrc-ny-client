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
    ]));
  });

  it("declares /transfers/v2/incoming as complete and tied to getIncomingTransfers", () => {
    const transfers = CLIENT_COVERAGE.find((r) => r.resource === "transfers")!;
    const incoming = transfers.endpoints.find((e) => e.path === "/transfers/v2/incoming");
    expect(incoming).toBeDefined();
    expect(incoming!.method).toBe("GET");
    expect(incoming!.clientMethod).toBe("getIncomingTransfers");
    expect(incoming!.status).toBe("complete");
  });

  it("lists getDeliveriesWithPackages as a transfers-resource helper composing two API methods", () => {
    const transfers = CLIENT_COVERAGE.find((r) => r.resource === "transfers")!;
    const helper = transfers.helpers?.find((h) => h.name === "getDeliveriesWithPackages");
    expect(helper).toBeDefined();
    expect(helper!.composes).toEqual(
      expect.arrayContaining(["getIncomingTransfers", "getPackagesForDelivery"]),
    );
  });

  it("declares both items endpoints as complete and tied to their client methods", () => {
    const items = CLIENT_COVERAGE.find((r) => r.resource === "items")!;
    const active = items.endpoints.find((e) => e.path === "/items/v2/active");
    const categories = items.endpoints.find((e) => e.path === "/items/v2/categories");
    expect(active?.status).toBe("complete");
    expect(active?.clientMethod).toBe("getActiveItems");
    expect(categories?.status).toBe("complete");
    expect(categories?.clientMethod).toBe("getItemCategories");
  });

  it("marks items resource as complete (every documented /items/v2/* endpoint is covered)", () => {
    const items = CLIENT_COVERAGE.find((r) => r.resource === "items")!;
    expect(items.status).toBe("complete");
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

  it("marks /sales/v2/transactions as out-of-scope-for-now (METRC returned 404 in discovery)", () => {
    const sales = CLIENT_COVERAGE.find((r) => r.resource === "sales")!;
    const transactions = sales.endpoints.find((e) => e.path === "/sales/v2/transactions");
    expect(transactions?.status).toBe("out-of-scope-for-now");
    expect(transactions?.clientMethod).toBeNull();
  });

  it("keeps sales resource status as partial while transactions is unresolved", () => {
    const sales = CLIENT_COVERAGE.find((r) => r.resource === "sales")!;
    expect(sales.status).toBe("partial");
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

  it("marks plants/plantbatches/harvests/waste as out-of-scope-for-now", () => {
    const expectedOutOfScope = ["plants", "plantbatches", "harvests", "waste"];
    for (const name of expectedOutOfScope) {
      const entry = CLIENT_COVERAGE.find((r) => r.resource === name);
      expect(entry, `resource ${name} should appear in CLIENT_COVERAGE as out-of-scope-for-now`).toBeDefined();
      expect(entry!.status).toBe("out-of-scope-for-now");
    }
  });

  it("marks packages resource as complete (active + inactive + onhold + types + adjust/reasons + by-id + by-label all done)", () => {
    const packages = CLIENT_COVERAGE.find((r) => r.resource === "packages")!;
    expect(packages.status).toBe("complete");
  });

  it("lists every packages endpoint that landed in phase 2 as complete", () => {
    const packages = CLIENT_COVERAGE.find((r) => r.resource === "packages")!;
    const byPath = Object.fromEntries(packages.endpoints.map(e => [e.path, e]));
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

  it("marks /packages/v2/{id}/history as out-of-scope-for-now (METRC returned 404 in discovery)", () => {
    const packages = CLIENT_COVERAGE.find((r) => r.resource === "packages")!;
    const history = packages.endpoints.find((e) => e.path === "/packages/v2/{id}/history");
    expect(history?.status).toBe("out-of-scope-for-now");
    expect(history?.clientMethod).toBeNull();
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
});
