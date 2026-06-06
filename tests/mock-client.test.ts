import { describe, it, expect } from "vitest";
import { createMockMetrcClient, type MockFixtures, DEFAULT_MOCK_FIXTURES } from "../src/client/mock.js";
import {
  metrcTransferSchema, metrcPackageSchema, metrcLocationSchema, metrcActivePackageSchema,
  metrcItemSchema, metrcSalesReceiptSchema, metrcSalesReceiptDetailSchema,
} from "../src/schemas/index.js";

describe("createMockMetrcClient", () => {
  it("returns default fixtures when none are passed", async () => {
    const client = createMockMetrcClient();
    const transfers = await client.getIncomingTransfers();
    expect(transfers.length).toBe(1);
  });

  it("default transfers parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const transfers = await client.getIncomingTransfers();
    for (const t of transfers) expect(() => metrcTransferSchema.parse(t)).not.toThrow();
  });

  it("default packages parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const transfers = await client.getIncomingTransfers();
    const packages = await client.getPackagesForDelivery(transfers[0]!.DeliveryId);
    expect(packages.length).toBeGreaterThan(0);
    for (const p of packages) expect(() => metrcPackageSchema.parse(p)).not.toThrow();
  });

  it("getDeliveriesWithPackages combines defaults consistently", async () => {
    const client = createMockMetrcClient();
    const result = await client.getDeliveriesWithPackages();
    const transfers = await client.getIncomingTransfers();
    expect(result.length).toBe(transfers.length);
    expect(result[0]!.transfer.Id).toBe(transfers[0]!.Id);
    expect(result[0]!.packages.length).toBe(2);
  });

  it("override fixtures replace the defaults entirely", async () => {
    const fixtures: MockFixtures = {
      transfers: [],
      packagesByDeliveryId: {},
      locations: [],
      activePackages: [],
      inactivePackages: [],
      onHoldPackages: [],
      items: [],
      salesReceipts: [],
      salesReceiptDetailsById: {},
    };
    const client = createMockMetrcClient(fixtures);
    expect(await client.getIncomingTransfers()).toEqual([]);
    expect(await client.getDeliveriesWithPackages()).toEqual([]);
    expect(await client.getActiveLocations()).toEqual([]);
    expect(await client.getActivePackages()).toEqual([]);
    expect(await client.getInactivePackages()).toEqual([]);
    expect(await client.getOnHoldPackages()).toEqual([]);
    expect(await client.getActiveItems()).toEqual([]);
    expect(await client.getActiveSalesReceipts({
      lastModifiedStart: "2026-01-01T00:00:00Z",
      lastModifiedEnd: "2026-12-31T00:00:00Z",
    })).toEqual([]);
  });

  it("getPackagesForDelivery returns the fixture mapped for that delivery id", async () => {
    const transfer = (await createMockMetrcClient().getIncomingTransfers())[0]!;
    const fakePkg = (await createMockMetrcClient().getPackagesForDelivery(transfer.DeliveryId))[0]!;
    const client = createMockMetrcClient({
      ...DEFAULT_MOCK_FIXTURES,
      transfers: [transfer],
      packagesByDeliveryId: { [transfer.DeliveryId]: [fakePkg, fakePkg] },
    });
    const pkgs = await client.getPackagesForDelivery(transfer.DeliveryId);
    expect(pkgs.length).toBe(2);
  });

  it("getPackagesForDelivery returns [] for an unknown delivery id", async () => {
    const client = createMockMetrcClient({ ...DEFAULT_MOCK_FIXTURES, transfers: [], packagesByDeliveryId: {} });
    const pkgs = await client.getPackagesForDelivery(999999);
    expect(pkgs).toEqual([]);
  });

  it("getDeliveriesWithPackages returns empty packages for a transfer with no fixture mapping", async () => {
    const transfer = (await createMockMetrcClient().getIncomingTransfers())[0]!;
    const client = createMockMetrcClient({
      ...DEFAULT_MOCK_FIXTURES,
      transfers: [transfer],
      packagesByDeliveryId: {}, // no entry for transfer.DeliveryId
    });
    const result = await client.getDeliveriesWithPackages();
    expect(result.length).toBe(1);
    expect(result[0]!.packages).toEqual([]);
  });

  it("default locations parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const locations = await client.getActiveLocations();
    expect(locations.length).toBe(2);
    for (const loc of locations) expect(() => metrcLocationSchema.parse(loc)).not.toThrow();
  });

  it("default active packages parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const pkgs = await client.getActivePackages();
    expect(pkgs.length).toBe(2);
    for (const p of pkgs) expect(() => metrcActivePackageSchema.parse(p)).not.toThrow();
  });

  it("getActiveLocations returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getActiveLocations();
    const b = await client.getActiveLocations();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("getActivePackages returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getActivePackages();
    const b = await client.getActivePackages();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("default items parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const items = await client.getActiveItems();
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) expect(() => metrcItemSchema.parse(it)).not.toThrow();
  });

  it("getActiveItems returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getActiveItems();
    const b = await client.getActiveItems();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("default sales receipts parse against the list-shape schema", async () => {
    const client = createMockMetrcClient();
    const receipts = await client.getActiveSalesReceipts({
      lastModifiedStart: "2026-01-01T00:00:00Z",
      lastModifiedEnd: "2026-12-31T00:00:00Z",
    });
    expect(receipts.length).toBeGreaterThan(0);
    for (const r of receipts) expect(() => metrcSalesReceiptSchema.parse(r)).not.toThrow();
  });

  it("getSalesReceiptById returns a populated detail with parseable transactions", async () => {
    const client = createMockMetrcClient();
    const detail = await client.getSalesReceiptById(7001);
    expect(() => metrcSalesReceiptDetailSchema.parse(detail)).not.toThrow();
    expect(detail.Transactions.length).toBeGreaterThan(0);
    expect(detail.Transactions[0]!.PackageLabel).toBeTruthy();
  });

  it("getSalesReceiptById throws for an unknown receipt id", async () => {
    const client = createMockMetrcClient();
    await expect(client.getSalesReceiptById(999999)).rejects.toThrow(/no sales receipt fixture/);
  });

  it("default inactive packages parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const pkgs = await client.getInactivePackages();
    expect(pkgs.length).toBeGreaterThan(0);
    for (const p of pkgs) expect(() => metrcActivePackageSchema.parse(p)).not.toThrow();
  });

  it("getInactivePackages returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getInactivePackages();
    const b = await client.getInactivePackages();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("default on-hold packages parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const pkgs = await client.getOnHoldPackages();
    expect(pkgs.length).toBeGreaterThan(0);
    for (const p of pkgs) expect(() => metrcActivePackageSchema.parse(p)).not.toThrow();
  });

  it("getOnHoldPackages returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getOnHoldPackages();
    const b = await client.getOnHoldPackages();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
