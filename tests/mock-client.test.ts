import { describe, it, expect } from "vitest";
import { createMockMetrcClient, type MockFixtures, DEFAULT_MOCK_FIXTURES } from "../src/client/mock.js";
import {
  metrcTransferSchema, metrcOutgoingTransferSchema, metrcTransferTypeSchema, metrcPackageSchema, metrcLocationSchema, metrcActivePackageSchema,
  metrcPackageAdjustReasonSchema, metrcPackageAdjustmentSchema, metrcTransferredPackageSchema, metrcPackageSourceHarvestSchema,
  metrcItemSchema, metrcSalesReceiptSchema, metrcSalesReceiptDetailSchema,
  metrcItemCategorySchema, metrcStrainSchema, metrcSublocationSchema, metrcLocationTypeSchema,
  metrcSalesPatientRegistrationLocationSchema, metrcSalesDeliveryReturnReasonSchema,
  metrcSalesCountySchema, metrcSalesPaymentTypeSchema, metrcSalesDeliverySchema, metrcSalesRetailerDeliverySchema,
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
      outgoingTransfers: [],
      rejectedTransfers: [],
      transferTypes: [],
      packagesByDeliveryId: {},
      locations: [],
      activePackages: [],
      inactivePackages: [],
      onHoldPackages: [],
      packageTypes: [],
      packageAdjustReasons: [],
      packageAdjustments: [],
      transferredPackages: [],
      inTransitPackages: [],
      labSamplePackages: [],
      sourceHarvestsByPackageId: {},
      packageDetailsById: {},
      packageDetailsByLabel: {},
      items: [],
      salesReceipts: [],
      salesReceiptDetailsById: {},
      itemCategories: [],
      salesCustomerTypes: [],
      salesPatientRegistrationLocations: [],
      salesDeliveryReturnReasons: [],
      salesCounties: [],
      salesPaymentTypes: [],
      activeSalesDeliveries: [],
      inactiveSalesDeliveries: [],
      activeRetailerSalesDeliveries: [],
      inactiveRetailerSalesDeliveries: [],
      inactiveSalesReceipts: [],
      salesReceiptByExternalNumber: {},
      salesDeliveryDetailsById: {},
      retailerSalesDeliveryDetailsById: {},
      strains: [],
      inactiveStrains: [],
      strainDetailsById: {},
      sublocations: [],
      inactiveSublocations: [],
      sublocationDetailsById: {},
      locationTypes: [],
      inactiveLocations: [],
      locationDetailsById: {},
    };
    const client = createMockMetrcClient(fixtures);
    expect(await client.getIncomingTransfers()).toEqual([]);
    expect(await client.getOutgoingTransfers()).toEqual([]);
    expect(await client.getRejectedTransfers()).toEqual([]);
    expect(await client.getTransferTypes()).toEqual([]);
    expect(await client.getDeliveriesWithPackages()).toEqual([]);
    expect(await client.getActiveLocations()).toEqual([]);
    expect(await client.getActivePackages()).toEqual([]);
    expect(await client.getInactivePackages()).toEqual([]);
    expect(await client.getOnHoldPackages()).toEqual([]);
    expect(await client.getPackageTypes()).toEqual([]);
    expect(await client.getPackageAdjustReasons()).toEqual([]);
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

  it("default sales customer types are non-empty and each is a string", async () => {
    const client = createMockMetrcClient();
    const types = await client.getSalesCustomerTypes();
    expect(types.length).toBeGreaterThan(0);
    for (const t of types) expect(typeof t).toBe("string");
  });

  it("getSalesCustomerTypes returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getSalesCustomerTypes();
    const b = await client.getSalesCustomerTypes();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
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

  it("default package types round-trip", async () => {
    const client = createMockMetrcClient();
    const types = await client.getPackageTypes();
    expect(types.length).toBeGreaterThan(0);
    for (const t of types) expect(typeof t).toBe("string");
  });

  it("getPackageTypes returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getPackageTypes();
    const b = await client.getPackageTypes();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("default package adjust reasons parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const reasons = await client.getPackageAdjustReasons();
    expect(reasons.length).toBeGreaterThan(0);
    for (const r of reasons) expect(() => metrcPackageAdjustReasonSchema.parse(r)).not.toThrow();
  });

  it("getPackageAdjustReasons returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getPackageAdjustReasons();
    const b = await client.getPackageAdjustReasons();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("getPackageById returns the fixture entry for the given id", async () => {
    const client = createMockMetrcClient();
    const knownId = Number(Object.keys(DEFAULT_MOCK_FIXTURES.packageDetailsById)[0]);
    expect(Number.isFinite(knownId)).toBe(true);
    const pkg = await client.getPackageById(knownId);
    expect(pkg.Id).toBe(knownId);
    expect(() => metrcActivePackageSchema.parse(pkg)).not.toThrow();
  });

  it("getPackageById throws for an unknown id", async () => {
    const client = createMockMetrcClient();
    await expect(client.getPackageById(999999)).rejects.toThrow(/no package fixture/);
  });

  it("getPackageByLabel returns the fixture entry for the given label", async () => {
    const client = createMockMetrcClient();
    const knownLabel = Object.keys(DEFAULT_MOCK_FIXTURES.packageDetailsByLabel)[0]!;
    const pkg = await client.getPackageByLabel(knownLabel);
    expect(pkg.Label).toBe(knownLabel);
    expect(() => metrcActivePackageSchema.parse(pkg)).not.toThrow();
  });

  it("getPackageByLabel throws for an unknown label", async () => {
    const client = createMockMetrcClient();
    await expect(client.getPackageByLabel("NOPE")).rejects.toThrow(/no package fixture/);
  });

  it("default item categories parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const categories = await client.getItemCategories();
    expect(categories.length).toBeGreaterThan(0);
    for (const c of categories) expect(() => metrcItemCategorySchema.parse(c)).not.toThrow();
  });

  it("getItemCategories returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getItemCategories();
    const b = await client.getItemCategories();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("default outgoing transfers parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const outgoing = await client.getOutgoingTransfers();
    for (const t of outgoing) expect(() => metrcOutgoingTransferSchema.parse(t)).not.toThrow();
  });

  it("getOutgoingTransfers returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getOutgoingTransfers();
    const b = await client.getOutgoingTransfers();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("default rejected transfers is empty but returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getRejectedTransfers();
    const b = await client.getRejectedTransfers();
    expect(a.length).toBe(0);
    expect(b.length).toBe(0);
    expect(a).not.toBe(b);
  });

  it("default transfer types parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const types = await client.getTransferTypes();
    for (const t of types) expect(() => metrcTransferTypeSchema.parse(t)).not.toThrow();
  });

  it("getTransferTypes returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getTransferTypes();
    const b = await client.getTransferTypes();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("default strains parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const strains = await client.getActiveStrains();
    for (const s of strains) expect(() => metrcStrainSchema.parse(s)).not.toThrow();
  });

  it("getActiveStrains returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getActiveStrains();
    const b = await client.getActiveStrains();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("getInactiveStrains returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getInactiveStrains();
    const b = await client.getInactiveStrains();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("getStrainById returns the fixture entry for the given id", async () => {
    const client = createMockMetrcClient();
    const knownId = Number(Object.keys(DEFAULT_MOCK_FIXTURES.strainDetailsById)[0]);
    expect(Number.isFinite(knownId)).toBe(true);
    const strain = await client.getStrainById(knownId);
    expect(strain.Id).toBe(knownId);
    expect(() => metrcStrainSchema.parse(strain)).not.toThrow();
  });

  it("getStrainById throws for an unknown id", async () => {
    const client = createMockMetrcClient();
    await expect(client.getStrainById(999999)).rejects.toThrow(/no strain fixture/);
  });

  it("default sublocations parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const sublocations = await client.getActiveSublocations();
    for (const s of sublocations) expect(() => metrcSublocationSchema.parse(s)).not.toThrow();
  });

  it("getActiveSublocations returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getActiveSublocations();
    const b = await client.getActiveSublocations();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("getInactiveSublocations returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getInactiveSublocations();
    const b = await client.getInactiveSublocations();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("getSublocationById returns the fixture entry for the given id", async () => {
    const client = createMockMetrcClient();
    const knownId = Number(Object.keys(DEFAULT_MOCK_FIXTURES.sublocationDetailsById)[0]);
    expect(Number.isFinite(knownId)).toBe(true);
    const sublocation = await client.getSublocationById(knownId);
    expect(sublocation.Id).toBe(knownId);
    expect(() => metrcSublocationSchema.parse(sublocation)).not.toThrow();
  });

  it("getSublocationById throws for an unknown id", async () => {
    const client = createMockMetrcClient();
    await expect(client.getSublocationById(999999)).rejects.toThrow(/no sublocation fixture/);
  });

  it("default location types parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const types = await client.getLocationTypes();
    for (const t of types) expect(() => metrcLocationTypeSchema.parse(t)).not.toThrow();
  });

  it("getLocationTypes returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getLocationTypes();
    const b = await client.getLocationTypes();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("getInactiveLocations returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getInactiveLocations();
    const b = await client.getInactiveLocations();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("getLocationById returns the fixture entry for the given id", async () => {
    const client = createMockMetrcClient();
    const knownId = Number(Object.keys(DEFAULT_MOCK_FIXTURES.locationDetailsById)[0]);
    expect(Number.isFinite(knownId)).toBe(true);
    const location = await client.getLocationById(knownId);
    expect(location.Id).toBe(knownId);
    expect(() => metrcLocationSchema.parse(location)).not.toThrow();
  });

  it("getLocationById throws for an unknown id", async () => {
    const client = createMockMetrcClient();
    await expect(client.getLocationById(999999)).rejects.toThrow(/no location fixture/);
  });

  it("default package adjustments parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const adjustments = await client.getPackageAdjustments();
    for (const adj of adjustments) expect(() => metrcPackageAdjustmentSchema.parse(adj)).not.toThrow();
  });

  it("getPackageAdjustments returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getPackageAdjustments();
    const b = await client.getPackageAdjustments();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("default transferred packages parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const transferred = await client.getTransferredPackages();
    for (const pkg of transferred) expect(() => metrcTransferredPackageSchema.parse(pkg)).not.toThrow();
  });

  it("getTransferredPackages returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getTransferredPackages();
    const b = await client.getTransferredPackages();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("default in-transit packages parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const inTransit = await client.getInTransitPackages();
    for (const pkg of inTransit) expect(() => metrcActivePackageSchema.parse(pkg)).not.toThrow();
  });

  it("getInTransitPackages returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getInTransitPackages();
    const b = await client.getInTransitPackages();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("default lab sample packages parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const labSamples = await client.getLabSamplePackages();
    for (const pkg of labSamples) expect(() => metrcActivePackageSchema.parse(pkg)).not.toThrow();
  });

  it("getLabSamplePackages returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getLabSamplePackages();
    const b = await client.getLabSamplePackages();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("getPackageSourceHarvests returns fixtures for a known package id", async () => {
    const client = createMockMetrcClient();
    const knownId = 5001; // DEFAULT_ACTIVE_PACKAGE_A.Id
    const harvests = await client.getPackageSourceHarvests(knownId);
    for (const h of harvests) expect(() => metrcPackageSourceHarvestSchema.parse(h)).not.toThrow();
  });

  it("getPackageSourceHarvests returns empty array for an unknown id", async () => {
    const client = createMockMetrcClient();
    const harvests = await client.getPackageSourceHarvests(999999);
    expect(harvests).toEqual([]);
  });

  it("getPackageSourceHarvests returns a defensive copy", async () => {
    const client = createMockMetrcClient();
    const a = await client.getPackageSourceHarvests(5001);
    const b = await client.getPackageSourceHarvests(5001);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("override-fixtures test: can override all fourteen new fixture groups with empty values", async () => {
    const overrides: MockFixtures = {
      ...DEFAULT_MOCK_FIXTURES,
      packageAdjustments: [],
      transferredPackages: [],
      inTransitPackages: [],
      labSamplePackages: [],
      sourceHarvestsByPackageId: {},
      strains: [],
      inactiveStrains: [],
      strainDetailsById: {},
      sublocations: [],
      inactiveSublocations: [],
      sublocationDetailsById: {},
      locationTypes: [],
      inactiveLocations: [],
      locationDetailsById: {},
    };
    const client = createMockMetrcClient(overrides);
    expect(await client.getPackageAdjustments()).toEqual([]);
    expect(await client.getTransferredPackages()).toEqual([]);
    expect(await client.getInTransitPackages()).toEqual([]);
    expect(await client.getLabSamplePackages()).toEqual([]);
    expect(await client.getPackageSourceHarvests(5001)).toEqual([]);
    expect(await client.getActiveStrains()).toEqual([]);
    expect(await client.getLocationTypes()).toEqual([]);
    expect(await client.getActiveSublocations()).toEqual([]);
  });

  // ── Phase 7 sales expansion mock tests ─────────────────────────────────────

  it("getSalesPatientRegistrationLocations returns default locations that parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const result = await client.getSalesPatientRegistrationLocations();
    expect(result.length).toBe(DEFAULT_MOCK_FIXTURES.salesPatientRegistrationLocations.length);
    for (const loc of result) expect(() => metrcSalesPatientRegistrationLocationSchema.parse(loc)).not.toThrow();
  });

  it("getSalesDeliveryReturnReasons returns default reasons that parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const result = await client.getSalesDeliveryReturnReasons();
    expect(result.length).toBe(DEFAULT_MOCK_FIXTURES.salesDeliveryReturnReasons.length);
    for (const reason of result) expect(() => metrcSalesDeliveryReturnReasonSchema.parse(reason)).not.toThrow();
  });

  it("getSalesCounties returns default counties that parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const result = await client.getSalesCounties();
    expect(result.length).toBe(DEFAULT_MOCK_FIXTURES.salesCounties.length);
    for (const county of result) expect(() => metrcSalesCountySchema.parse(county)).not.toThrow();
  });

  it("getSalesPaymentTypes returns default payment types that parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const result = await client.getSalesPaymentTypes();
    expect(result.length).toBe(DEFAULT_MOCK_FIXTURES.salesPaymentTypes.length);
    for (const pt of result) expect(() => metrcSalesPaymentTypeSchema.parse(pt)).not.toThrow();
  });

  it("getActiveSalesDeliveries returns default deliveries that parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const result = await client.getActiveSalesDeliveries({ lastModifiedStart: "2026-01-01T00:00:00Z", lastModifiedEnd: "2026-12-31T23:59:59Z" });
    expect(result.length).toBe(DEFAULT_MOCK_FIXTURES.activeSalesDeliveries.length);
    for (const d of result) expect(() => metrcSalesDeliverySchema.parse(d)).not.toThrow();
  });

  it("getInactiveSalesDeliveries returns empty array from default fixtures", async () => {
    const client = createMockMetrcClient();
    const result = await client.getInactiveSalesDeliveries({ lastModifiedStart: "2026-01-01T00:00:00Z", lastModifiedEnd: "2026-12-31T23:59:59Z" });
    expect(result).toEqual([]);
  });

  it("getActiveRetailerSalesDeliveries returns default retailer deliveries that parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const result = await client.getActiveRetailerSalesDeliveries({ lastModifiedStart: "2026-01-01T00:00:00Z", lastModifiedEnd: "2026-12-31T23:59:59Z" });
    expect(result.length).toBe(DEFAULT_MOCK_FIXTURES.activeRetailerSalesDeliveries.length);
    for (const d of result) expect(() => metrcSalesRetailerDeliverySchema.parse(d)).not.toThrow();
  });

  it("getInactiveRetailerSalesDeliveries returns empty array from default fixtures", async () => {
    const client = createMockMetrcClient();
    const result = await client.getInactiveRetailerSalesDeliveries({ lastModifiedStart: "2026-01-01T00:00:00Z", lastModifiedEnd: "2026-12-31T23:59:59Z" });
    expect(result).toEqual([]);
  });

  it("getInactiveSalesReceipts returns default inactive receipts that parse against the Zod schema", async () => {
    const client = createMockMetrcClient();
    const result = await client.getInactiveSalesReceipts({ lastModifiedStart: "2025-01-01T00:00:00Z", lastModifiedEnd: "2026-12-31T23:59:59Z" });
    expect(result.length).toBe(DEFAULT_MOCK_FIXTURES.inactiveSalesReceipts.length);
    for (const r of result) expect(() => metrcSalesReceiptSchema.parse(r)).not.toThrow();
  });

  it("getSalesReceiptByExternalNumber returns the receipt detail for a known external number", async () => {
    const client = createMockMetrcClient();
    const knownExtNum = Object.keys(DEFAULT_MOCK_FIXTURES.salesReceiptByExternalNumber)[0]!;
    const result = await client.getSalesReceiptByExternalNumber(knownExtNum);
    expect(result.Id).toBe(DEFAULT_MOCK_FIXTURES.salesReceiptByExternalNumber[knownExtNum]!.Id);
    expect(() => metrcSalesReceiptDetailSchema.parse(result)).not.toThrow();
  });

  it("getSalesReceiptByExternalNumber throws for an unknown external number", async () => {
    const client = createMockMetrcClient();
    await expect(client.getSalesReceiptByExternalNumber("unknown-ext-num")).rejects.toThrow(/no sales receipt fixture/);
  });

  it("getSalesDeliveryById returns the delivery for a known id", async () => {
    const client = createMockMetrcClient();
    const knownId = Number(Object.keys(DEFAULT_MOCK_FIXTURES.salesDeliveryDetailsById)[0]);
    const result = await client.getSalesDeliveryById(knownId);
    expect(result.Id).toBe(knownId);
    expect(() => metrcSalesDeliverySchema.parse(result)).not.toThrow();
  });

  it("getSalesDeliveryById throws for an unknown id", async () => {
    const client = createMockMetrcClient();
    await expect(client.getSalesDeliveryById(999999)).rejects.toThrow(/no sales delivery fixture/);
  });

  it("getRetailerSalesDeliveryById returns the delivery for a known id", async () => {
    const client = createMockMetrcClient();
    const knownId = Number(Object.keys(DEFAULT_MOCK_FIXTURES.retailerSalesDeliveryDetailsById)[0]);
    const result = await client.getRetailerSalesDeliveryById(knownId);
    expect(result.Id).toBe(knownId);
    expect(() => metrcSalesRetailerDeliverySchema.parse(result)).not.toThrow();
  });

  it("getRetailerSalesDeliveryById throws for an unknown id", async () => {
    const client = createMockMetrcClient();
    await expect(client.getRetailerSalesDeliveryById(999999)).rejects.toThrow(/no retailer sales delivery fixture/);
  });
});
