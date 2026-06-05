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

  it("declares sales receipts list+detail complete, /sales/v2/transactions and /sales/v2/customertypes planned", () => {
    const sales = CLIENT_COVERAGE.find((r) => r.resource === "sales")!;
    const receiptsActive = sales.endpoints.find((e) => e.path === "/sales/v2/receipts/active");
    const receiptById = sales.endpoints.find((e) => e.path === "/sales/v2/receipts/{id}");
    const txns = sales.endpoints.find((e) => e.path === "/sales/v2/transactions");
    const customers = sales.endpoints.find((e) => e.path === "/sales/v2/customertypes");
    expect(receiptsActive?.status).toBe("complete");
    expect(receiptsActive?.clientMethod).toBe("getActiveSalesReceipts");
    expect(receiptById?.status).toBe("complete");
    expect(receiptById?.clientMethod).toBe("getSalesReceiptById");
    expect(txns?.status).toBe("planned");
    expect(customers?.status).toBe("planned");
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
});
