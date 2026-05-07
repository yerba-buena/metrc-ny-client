import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLiveMetrcClient } from "../src/client/live.js";
import { createMockMetrcClient, DEFAULT_MOCK_FIXTURES } from "../src/client/mock.js";
import { NOOP_LOGGER } from "../src/logger.js";
import type { MetrcClient } from "../src/client/interface.js";
import type { MetrcTransfer, MetrcPackage, MetrcLocation, MetrcActivePackage } from "../src/schemas/index.js";
import { metrcTransferSchema, metrcPackageSchema, metrcLocationSchema, metrcActivePackageSchema } from "../src/schemas/index.js";

const okEnvelope = (data: unknown[]) => ({
  ok: true, status: 200, headers: new Headers(),
  json: async () => ({
    Data: data, Total: data.length, TotalRecords: data.length,
    PageSize: 20, RecordsOnPage: data.length, Page: 1, CurrentPage: 1, TotalPages: 1,
  }),
  text: async () => "",
});

function makeLiveClientFromFixtures(
  transfers: MetrcTransfer[],
  packagesByDeliveryId: Record<number, MetrcPackage[]>,
  locations: MetrcLocation[],
  activePackages: MetrcActivePackage[],
): MetrcClient {
  const fetch = vi.fn(async (url: string) => {
    if (url.includes("/transfers/v2/incoming")) return okEnvelope(transfers) as unknown as Response;
    if (url.includes("/locations/v2/active")) return okEnvelope(locations) as unknown as Response;
    if (url.includes("/packages/v2/active")) return okEnvelope(activePackages) as unknown as Response;
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
  ["live (with stubbed fetch)", () => makeLiveClientFromFixtures(fixtures.transfers, fixtures.packagesByDeliveryId, fixtures.locations, fixtures.activePackages)],
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
});
