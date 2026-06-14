import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLiveMetrcClient } from "../src/client/live.js";
import { createMockMetrcClient, DEFAULT_MOCK_FIXTURES } from "../src/client/mock.js";
import { NOOP_LOGGER } from "../src/logger.js";
import type { MetrcClient } from "../src/client/interface.js";
import type {
  MetrcTransfer, MetrcOutgoingTransfer, MetrcTransferType, MetrcPackage, MetrcLocation, MetrcActivePackage, MetrcPackageAdjustReason,
  MetrcItem, MetrcSalesReceipt, MetrcSalesReceiptDetail,
  MetrcItemCategory, MetrcStrain, MetrcSublocation, MetrcLocationType,
} from "../src/schemas/index.js";
import {
  metrcTransferSchema, metrcOutgoingTransferSchema, metrcTransferTypeSchema, metrcPackageSchema, metrcLocationSchema, metrcActivePackageSchema,
  metrcPackageAdjustReasonSchema,
  metrcItemSchema, metrcSalesReceiptSchema, metrcSalesReceiptDetailSchema,
  metrcItemCategorySchema, metrcStrainSchema, metrcSublocationSchema, metrcLocationTypeSchema,
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
  outgoingTransfers: MetrcOutgoingTransfer[],
  rejectedTransfers: MetrcOutgoingTransfer[],
  transferTypes: MetrcTransferType[],
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
  itemCategories: MetrcItemCategory[],
  salesCustomerTypes: string[],
  strains: MetrcStrain[],
  inactiveStrains: MetrcStrain[],
  strainDetailsById: Record<number, MetrcStrain>,
  sublocations: MetrcSublocation[],
  inactiveSublocations: MetrcSublocation[],
  sublocationDetailsById: Record<number, MetrcSublocation>,
  locationTypes: MetrcLocationType[],
  inactiveLocations: MetrcLocation[],
  locationDetailsById: Record<number, MetrcLocation>,
): MetrcClient {
  const fetch = vi.fn(async (url: string) => {
    if (url.includes("/items/v2/categories")) return okEnvelope(itemCategories) as unknown as Response;
    if (url.includes("/packages/v2/types")) return bareArray(packageTypes) as unknown as Response;
    if (url.includes("/packages/v2/adjust/reasons")) return okEnvelope(packageAdjustReasons) as unknown as Response;
    if (url.includes("/transfers/v2/types")) return okEnvelope(transferTypes) as unknown as Response;
    if (url.includes("/transfers/v2/outgoing")) return okEnvelope(outgoingTransfers) as unknown as Response;
    if (url.includes("/transfers/v2/rejected")) return okEnvelope(rejectedTransfers) as unknown as Response;
    if (url.includes("/transfers/v2/incoming")) return okEnvelope(transfers) as unknown as Response;
    // Phase 5 endpoints - locations expansion (types + inactive + by-id, all before /locations/v2/active)
    if (url.includes("/locations/v2/types")) return okEnvelope(locationTypes) as unknown as Response;
    if (url.includes("/locations/v2/inactive")) return okEnvelope(inactiveLocations) as unknown as Response;
    if (url.includes("/locations/v2/active")) return okEnvelope(locations) as unknown as Response;
    // Phase 5 endpoints - strains (active + inactive before by-id regex)
    if (url.includes("/strains/v2/active")) return okEnvelope(strains) as unknown as Response;
    if (url.includes("/strains/v2/inactive")) return okEnvelope(inactiveStrains) as unknown as Response;
    // Phase 5 endpoints - sublocations (active + inactive before by-id regex)
    if (url.includes("/sublocations/v2/active")) return okEnvelope(sublocations) as unknown as Response;
    if (url.includes("/sublocations/v2/inactive")) return okEnvelope(inactiveSublocations) as unknown as Response;
    if (url.includes("/packages/v2/inactive")) return okEnvelope(inactivePackages) as unknown as Response;
    if (url.includes("/packages/v2/onhold")) return okEnvelope(onHoldPackages) as unknown as Response;
    if (url.includes("/packages/v2/active")) return okEnvelope(activePackages) as unknown as Response;
    if (url.includes("/items/v2/active")) return okEnvelope(items) as unknown as Response;
    if (url.includes("/sales/v2/customertypes")) return bareArray(salesCustomerTypes) as unknown as Response;
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
    // Phase 5 strain by-id (must come after active/inactive list matchers)
    const strainDetailMatch = url.match(/\/strains\/v2\/(\d+)(?:\?|$)/);
    if (strainDetailMatch) {
      const id = parseInt(strainDetailMatch[1]!, 10);
      const strain = strainDetailsById[id];
      if (!strain) throw new Error(`fixture: no strain detail for id ${id}`);
      return {
        ok: true, status: 200, headers: new Headers(),
        json: async () => strain, text: async () => "",
      } as unknown as Response;
    }
    // Phase 5 sublocation by-id (must come after active/inactive list matchers)
    const subLocDetailMatch = url.match(/\/sublocations\/v2\/(\d+)(?:\?|$)/);
    if (subLocDetailMatch) {
      const id = parseInt(subLocDetailMatch[1]!, 10);
      const subloc = sublocationDetailsById[id];
      if (!subloc) throw new Error(`fixture: no sublocation detail for id ${id}`);
      return {
        ok: true, status: 200, headers: new Headers(),
        json: async () => subloc, text: async () => "",
      } as unknown as Response;
    }
    // Phase 5 location by-id (must come after types/inactive/active list matchers)
    const locDetailMatch = url.match(/\/locations\/v2\/(\d+)(?:\?|$)/);
    if (locDetailMatch) {
      const id = parseInt(locDetailMatch[1]!, 10);
      const loc = locationDetailsById[id];
      if (!loc) throw new Error(`fixture: no location detail for id ${id}`);
      return {
        ok: true, status: 200, headers: new Headers(),
        json: async () => loc, text: async () => "",
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
    fixtures.outgoingTransfers,
    fixtures.rejectedTransfers,
    fixtures.transferTypes,
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
    fixtures.itemCategories,
    fixtures.salesCustomerTypes,
    fixtures.strains,
    fixtures.inactiveStrains,
    fixtures.strainDetailsById,
    fixtures.sublocations,
    fixtures.inactiveSublocations,
    fixtures.sublocationDetailsById,
    fixtures.locationTypes,
    fixtures.inactiveLocations,
    fixtures.locationDetailsById,
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

  it("getSalesCustomerTypes returns a bare array of strings", async () => {
    const client = makeClient();
    const result = await client.getSalesCustomerTypes();
    expect(result.length).toBe(fixtures.salesCustomerTypes.length);
    for (const t of result) expect(typeof t).toBe("string");
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

  it("getItemCategories returns categories that parse as MetrcItemCategory", async () => {
    const client = makeClient();
    const result = await client.getItemCategories();
    expect(result.length).toBe(fixtures.itemCategories.length);
    for (const c of result) expect(() => metrcItemCategorySchema.parse(c)).not.toThrow();
  });

  it("getOutgoingTransfers returns transfers that parse as MetrcOutgoingTransfer", async () => {
    const client = makeClient();
    const result = await client.getOutgoingTransfers();
    expect(result.length).toBe(fixtures.outgoingTransfers.length);
    for (const t of result) expect(() => metrcOutgoingTransferSchema.parse(t)).not.toThrow();
  });

  it("getRejectedTransfers returns transfers that parse as MetrcOutgoingTransfer", async () => {
    const client = makeClient();
    const result = await client.getRejectedTransfers();
    expect(result.length).toBe(fixtures.rejectedTransfers.length);
    for (const t of result) expect(() => metrcOutgoingTransferSchema.parse(t)).not.toThrow();
  });

  it("getTransferTypes returns types that parse as MetrcTransferType", async () => {
    const client = makeClient();
    const result = await client.getTransferTypes();
    expect(result.length).toBe(fixtures.transferTypes.length);
    for (const t of result) expect(() => metrcTransferTypeSchema.parse(t)).not.toThrow();
  });

  it("getActiveStrains returns strains that parse as MetrcStrain", async () => {
    const client = makeClient();
    const result = await client.getActiveStrains();
    expect(result.length).toBe(fixtures.strains.length);
    for (const s of result) expect(() => metrcStrainSchema.parse(s)).not.toThrow();
  });

  it("getInactiveStrains returns strains that parse as MetrcStrain", async () => {
    const client = makeClient();
    const result = await client.getInactiveStrains();
    expect(result.length).toBe(fixtures.inactiveStrains.length);
    for (const s of result) expect(() => metrcStrainSchema.parse(s)).not.toThrow();
  });

  it("getStrainById returns a single strain that parses as MetrcStrain", async () => {
    const client = makeClient();
    const knownId = Number(Object.keys(fixtures.strainDetailsById)[0]);
    expect(Number.isFinite(knownId)).toBe(true);
    const strain = await client.getStrainById(knownId);
    expect(strain.Id).toBe(knownId);
    expect(() => metrcStrainSchema.parse(strain)).not.toThrow();
  });

  it("getActiveSublocations returns sublocations that parse as MetrcSublocation", async () => {
    const client = makeClient();
    const result = await client.getActiveSublocations();
    expect(result.length).toBe(fixtures.sublocations.length);
    for (const s of result) expect(() => metrcSublocationSchema.parse(s)).not.toThrow();
  });

  it("getInactiveSublocations returns sublocations that parse as MetrcSublocation", async () => {
    const client = makeClient();
    const result = await client.getInactiveSublocations();
    expect(result.length).toBe(fixtures.inactiveSublocations.length);
    for (const s of result) expect(() => metrcSublocationSchema.parse(s)).not.toThrow();
  });

  it("getSublocationById returns a single sublocation that parses as MetrcSublocation", async () => {
    const client = makeClient();
    const knownId = Number(Object.keys(fixtures.sublocationDetailsById)[0]);
    expect(Number.isFinite(knownId)).toBe(true);
    const sublocation = await client.getSublocationById(knownId);
    expect(sublocation.Id).toBe(knownId);
    expect(() => metrcSublocationSchema.parse(sublocation)).not.toThrow();
  });

  it("getLocationTypes returns location types that parse as MetrcLocationType", async () => {
    const client = makeClient();
    const result = await client.getLocationTypes();
    expect(result.length).toBe(fixtures.locationTypes.length);
    for (const t of result) expect(() => metrcLocationTypeSchema.parse(t)).not.toThrow();
  });

  it("getInactiveLocations returns locations that parse as MetrcLocation", async () => {
    const client = makeClient();
    const result = await client.getInactiveLocations();
    expect(result.length).toBe(fixtures.inactiveLocations.length);
    for (const loc of result) expect(() => metrcLocationSchema.parse(loc)).not.toThrow();
  });

  it("getLocationById returns a single location that parses as MetrcLocation", async () => {
    const client = makeClient();
    const knownId = Number(Object.keys(fixtures.locationDetailsById)[0]);
    expect(Number.isFinite(knownId)).toBe(true);
    const location = await client.getLocationById(knownId);
    expect(location.Id).toBe(knownId);
    expect(() => metrcLocationSchema.parse(location)).not.toThrow();
  });
});
