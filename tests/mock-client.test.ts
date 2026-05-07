import { describe, it, expect } from "vitest";
import { createMockMetrcClient, type MockFixtures, DEFAULT_MOCK_FIXTURES } from "../src/client/mock.js";
import { metrcTransferSchema, metrcPackageSchema, metrcLocationSchema, metrcActivePackageSchema } from "../src/schemas/index.js";

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
    for (const dwp of result) {
      expect(dwp.transfer).toBeDefined();
      expect(Array.isArray(dwp.packages)).toBe(true);
    }
  });

  it("override fixtures replace the defaults entirely", async () => {
    const fixtures: MockFixtures = {
      transfers: [],
      packagesByDeliveryId: {},
      locations: [],
      activePackages: [],
    };
    const client = createMockMetrcClient(fixtures);
    expect(await client.getIncomingTransfers()).toEqual([]);
    expect(await client.getDeliveriesWithPackages()).toEqual([]);
    expect(await client.getActiveLocations()).toEqual([]);
    expect(await client.getActivePackages()).toEqual([]);
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
});
