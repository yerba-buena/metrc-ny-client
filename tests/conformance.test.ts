import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLiveMetrcClient } from "../src/client/live.js";
import { createMockMetrcClient, DEFAULT_MOCK_FIXTURES } from "../src/client/mock.js";
import { NOOP_LOGGER } from "../src/logger.js";
import type { MetrcClient } from "../src/client/interface.js";
import type {
  MetrcTransfer, MetrcPackage, MetrcLocation, MetrcActivePackage, MetrcPackageAdjustReason,
  MetrcItem, MetrcSalesReceipt, MetrcSalesReceiptDetail,
} from "../src/schemas/index.js";
import {
  metrcTransferSchema, metrcPackageSchema, metrcLocationSchema, metrcActivePackageSchema,
  metrcPackageAdjustReasonSchema,
  metrcItemSchema, metrcSalesReceiptSchema, metrcSalesReceiptDetailSchema,
} from "../src/schemas/index.js";

const okEnvelope = (data: unknown[]) => ({
  ok: true, status: 200, headers: new Headers(),
  json: async () => ({
    Data: data, Total: data.length, TotalRecords: data.length,
    PageSize: 20, RecordsOnPage: data.length, Page: 1, CurrentPage: 1, TotalPages: 1,
  }),
  text: async () => "",
});

const bareArray = (data: unknown[]) =>
  ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => data,
    text: async () => "",
  }) as unknown as Response;

function makeLiveClientFromFixtures(
  transfers: MetrcTransfer[],
  packagesByDeliveryId: Record<number, MetrcPackage[]>,
  locations: MetrcLocation[],
  activePackages: MetrcActivePackage[],
  inactivePackages: MetrcActivePackage[],
  onHoldPackages: MetrcActivePackage[],
  packageTypes: string[],
  packageAdjustReasons: MetrcPackageAdjustReason[],
  packageDetailsById: Record<number, MetrcActivePackage>,
  packageDetailsByLabel: Record<string, MetrcActivePackage>,
  items: MetrcItem[],
  salesReceipts: MetrcSalesReceipt[],
  salesReceiptDetailsById: Record<number, MetrcSalesReceiptDetail>,
): MetrcClient {
  const fetch = vi.fn(async (url: string) => {
    if (url.includes("/packages/v2/types")) return bareArray(packageTypes) as unknown as Response;
    if (url.includes("/packages/v2/adjust/reasons")) return okEnvelope(packageAdjustReasons) as unknown as Response;
    if (url.includes("/transfers/v2/incoming")) return okEnvelope(transfers) as unknown as Response;
    if (url.includes("/locations/v2/active")) return okEnvelope(locations) as unknown as Response;
    if (url.includes("/packages/v2/inactive")) return okEnvelope(inactivePackages) as unknown as Response;
    if (url.includes("/packages/v2/onhold")) return okEnvelope(onHoldPackages) as unknown as Response;
    if (url.includes("/packages/v2/active")) return okEnvelope(activePackages) as unknown as Response;
    if (url.includes("/items/v2/active")) return okEnvelope(items) as unknown as Response;
    if (url.includes("/sales/v2/receipts/active")) return okEnvelope(salesReceipts) as unknown as Response;
    const receiptDetailMatch = url.match(/\/sales\/v2\/receipts\/(\d+)(?:\?|$)/);
    if (receiptDetailMatch) {
      const id = parseInt(receiptDetailMatch[1]!, 10);
      const detail = salesReceiptDetailsById[id];
      if (!detail) throw new Error(`fixture: no sales receipt detail for id ${id}`);
      return {
        ok: true, status: 200, headers: new Headers(),
        json: async () => detail,
        text: async () => "",
      } as unknown as Response;
    }
    // /packages/v2/{id-or-label} — must come after the list/lookup matchers above.
    const pkgDetailMatch = url.match(/\/packages\/v2\/([^/?]+)(?:\?|$)/);
    if (pkgDetailMatch) {
      const idOrLabel = pkgDetailMatch[1]!;
      const asNum = Number(idOrLabel);
      const pkg = Number.isFinite(asNum) && packageDetailsById[asNum]
        ? packageDetailsById[asNum]
        : packageDetailsByLabel[idOrLabel];
      if (!pkg) throw new Error(`fixture: no package detail for ${idOrLabel}`);
      return {
        ok: true, status: 200, headers: new Headers(),
        json: async () => pkg, text: async () => "",
      } as unknown as Response;
    }
    const m = url.match(/\/deliveries\/(\d+)\/packages/);
    if (m) {
      const id = parseInt(m[1]!, 10);
      return okEnvelope(packagesByDeliveryId[id] ?? []) as unknown as Response;
    }
    throw new Error(`unexpected url: ${url}`);
  });
  return createLiveMetrcClient({
    vendorApiKey: "vk", userApiKey: "uk", licenseNumber: "LIC",
    baseUrl: "https://example.test", logger: NOOP_LOGGER,
    fetch, rateLimitMs: 0,
    retry: { maxRetries: 0, initialDelayMs: 1, maxDelayMs: 1, backoffMultiplier: 1 },
  });
}

const fixtures = DEFAULT_MOCK_FIXTURES;
const variants: Array<[string, () => MetrcClient]> = [
  ["mock", () => createMockMetrcClient(fixtures)],
  ["live (with stubbed fetch)", () => makeLiveClientFromFixtures(
    fixtures.transfers,
    fixtures.packagesByDeliveryId,
    fixtures.locations,
    fixtures.activePackages,
    fixtures.inactivePackages,
    fixtures.onHoldPackages,
    fixtures.packageTypes,
    fixtures.packageAdjustReasons,
    fixtures.packageDetailsById,
    fixtures.packageDetailsByLabel,
    fixtures.items,
    fixtures.salesReceipts,
    fixtures.salesReceiptDetailsById,
  )],
];

describe.each(variants)("MetrcClient conformance — %s", (_name, makeClient) => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("getIncomingTransfers returns transfers that parse as MetrcTransfer", async () => {
    const client = makeClient();
    const result = await client.getIncomingTransfers();
    expect(result.length).toBe(fixtures.transfers.length);
    for (const t of result) expect(() => metrcTransferSchema.parse(t)).not.toThrow();
  });

  it("getPackagesForDelivery returns packages that parse as MetrcPackage", async () => {
    const client = makeClient();
    const transfers = await client.getIncomingTransfers();
    expect(transfers.length).toBeGreaterThan(0);
    const pkgs = await client.getPackagesForDelivery(transfers[0]!.DeliveryId);
    expect(pkgs.length).toBeGreaterThan(0);
    for (const p of pkgs) expect(() => metrcPackageSchema.parse(p)).not.toThrow();
  });

  it("getDeliveriesWithPackages returns one entry per transfer", async () => {
    const client = makeClient();
    const transfers = await client.getIncomingTransfers();
    const dwps = await client.getDeliveriesWithPackages();
    expect(dwps.length).toBe(transfers.length);
    expect(dwps.map(d => d.transfer.DeliveryId).sort()).toEqual(transfers.map(t => t.DeliveryId).sort());
  });

  it("getActiveLocations returns locations that parse as MetrcLocation", async () => {
    const client = makeClient();
    const result = await client.getActiveLocations();
    expect(result.length).toBe(fixtures.locations.length);
    for (const loc of result) expect(() => metrcLocationSchema.parse(loc)).not.toThrow();
  });

  it("getActivePackages returns packages that parse as MetrcActivePackage", async () => {
    const client = makeClient();
    const result = await client.getActivePackages();
    expect(result.length).toBe(fixtures.activePackages.length);
    for (const p of result) expect(() => metrcActivePackageSchema.parse(p)).not.toThrow();
  });

  it("getActiveItems returns items that parse as MetrcItem", async () => {
    const client = makeClient();
    const result = await client.getActiveItems();
    expect(result.length).toBe(fixtures.items.length);
    for (const item of result) expect(() => metrcItemSchema.parse(item)).not.toThrow();
  });

  it("getActiveSalesReceipts returns receipts that parse as MetrcSalesReceipt", async () => {
    const client = makeClient();
    const result = await client.getActiveSalesReceipts({
      lastModifiedStart: "2026-01-01T00:00:00Z",
      lastModifiedEnd: "2026-12-31T23:59:59Z",
    });
    expect(result.length).toBe(fixtures.salesReceipts.length);
    for (const r of result) expect(() => metrcSalesReceiptSchema.parse(r)).not.toThrow();
  });

  it("getSalesReceiptById returns a detail that parses as MetrcSalesReceiptDetail", async () => {
    const client = makeClient();
    const knownId = Number(Object.keys(fixtures.salesReceiptDetailsById)[0]);
    expect(Number.isFinite(knownId)).toBe(true);
    const detail = await client.getSalesReceiptById(knownId);
    expect(() => metrcSalesReceiptDetailSchema.parse(detail)).not.toThrow();
    expect(detail.Id).toBe(knownId);
    expect(detail.Transactions.length).toBeGreaterThan(0);
  });

  it("getInactivePackages returns packages that parse as MetrcActivePackage", async () => {
    const client = makeClient();
    const result = await client.getInactivePackages();
    expect(result.length).toBe(fixtures.inactivePackages.length);
    for (const p of result) expect(() => metrcActivePackageSchema.parse(p)).not.toThrow();
  });

  it("getOnHoldPackages returns packages that parse as MetrcActivePackage", async () => {
    const client = makeClient();
    const result = await client.getOnHoldPackages();
    expect(result.length).toBe(fixtures.onHoldPackages.length);
    for (const p of result) expect(() => metrcActivePackageSchema.parse(p)).not.toThrow();
  });

  it("getPackageTypes returns a bare array of strings", async () => {
    const client = makeClient();
    const result = await client.getPackageTypes();
    expect(result.length).toBe(fixtures.packageTypes.length);
    for (const t of result) expect(typeof t).toBe("string");
  });

  it("getPackageAdjustReasons returns reasons that parse as MetrcPackageAdjustReason", async () => {
    const client = makeClient();
    const result = await client.getPackageAdjustReasons();
    expect(result.length).toBe(fixtures.packageAdjustReasons.length);
    for (const r of result) expect(() => metrcPackageAdjustReasonSchema.parse(r)).not.toThrow();
  });

  it("getPackageById returns a single package that parses as MetrcActivePackage", async () => {
    const client = makeClient();
    const knownId = Number(Object.keys(fixtures.packageDetailsById)[0]);
    expect(Number.isFinite(knownId)).toBe(true);
    const pkg = await client.getPackageById(knownId);
    expect(pkg.Id).toBe(knownId);
    expect(() => metrcActivePackageSchema.parse(pkg)).not.toThrow();
  });

  it("getPackageByLabel returns a single package that parses as MetrcActivePackage", async () => {
    const client = makeClient();
    const knownLabel = Object.keys(fixtures.packageDetailsByLabel)[0]!;
    const pkg = await client.getPackageByLabel(knownLabel);
    expect(pkg.Label).toBe(knownLabel);
    expect(() => metrcActivePackageSchema.parse(pkg)).not.toThrow();
  });
});
