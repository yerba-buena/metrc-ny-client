import { describe, it, expect } from "vitest";
import { createMockMetrcClient, type MockFixtures } from "../src/client/mock.js";
import { metrcTransferSchema, metrcPackageSchema } from "../src/schemas/index.js";

describe("createMockMetrcClient", () => {
  it("returns default fixtures when none are passed", async () => {
    const client = createMockMetrcClient();
    const transfers = await client.getIncomingTransfers();
    expect(Array.isArray(transfers)).toBe(true);
    expect(transfers.length).toBeGreaterThan(0);
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
    };
    const client = createMockMetrcClient(fixtures);
    expect(await client.getIncomingTransfers()).toEqual([]);
    expect(await client.getDeliveriesWithPackages()).toEqual([]);
  });

  it("getPackagesForDelivery returns the fixture mapped for that delivery id", async () => {
    const transfer = (await createMockMetrcClient().getIncomingTransfers())[0]!;
    const fakePkg = (await createMockMetrcClient().getPackagesForDelivery(transfer.DeliveryId))[0]!;
    const client = createMockMetrcClient({
      transfers: [transfer],
      packagesByDeliveryId: { [transfer.DeliveryId]: [fakePkg, fakePkg] },
    });
    const pkgs = await client.getPackagesForDelivery(transfer.DeliveryId);
    expect(pkgs.length).toBe(2);
  });

  it("getPackagesForDelivery returns [] for an unknown delivery id", async () => {
    const client = createMockMetrcClient({ transfers: [], packagesByDeliveryId: {} });
    const pkgs = await client.getPackagesForDelivery(999999);
    expect(pkgs).toEqual([]);
  });
});
