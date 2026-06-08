import { describe, it, expect } from "vitest";
import { groupByLocation } from "../src/helpers/group-by-location.js";
import { siteSnapshot } from "../src/helpers/site-snapshot.js";
import { createMockMetrcClient, DEFAULT_MOCK_FIXTURES } from "../src/client/mock.js";
import type { MetrcActivePackage } from "../src/schemas/index.js";

const makePkg = (overrides: Partial<MetrcActivePackage>): MetrcActivePackage => ({
  ...DEFAULT_MOCK_FIXTURES.activePackages[0]!,
  ...overrides,
});

describe("groupByLocation", () => {
  it("buckets packages by LocationName", () => {
    const a = makePkg({ Id: 1, LocationName: "Vault" });
    const b = makePkg({ Id: 2, LocationName: "Fulfillment" });
    const c = makePkg({ Id: 3, LocationName: "Vault" });
    const result = groupByLocation([a, b, c]);
    expect(Object.keys(result).sort()).toEqual(["Fulfillment", "Vault"]);
    expect(result["Vault"]?.map(p => p.Id).sort()).toEqual([1, 3]);
    expect(result["Fulfillment"]?.map(p => p.Id)).toEqual([2]);
  });

  it("buckets null-location packages under \"<no location>\"", () => {
    const a = makePkg({ Id: 1, LocationName: null });
    const result = groupByLocation([a]);
    expect(result["<no location>"]?.length).toBe(1);
    expect(result["<no location>"]![0]!.Id).toBe(1);
  });

  it("returns an empty object for an empty input", () => {
    expect(groupByLocation([])).toEqual({});
  });
});

describe("siteSnapshot", () => {
  it("composes locations + 3 package categories with grouping and counts", async () => {
    const client = createMockMetrcClient(); // uses DEFAULT_MOCK_FIXTURES
    const snapshot = await siteSnapshot(client);
    expect(snapshot.locations.length).toBe(DEFAULT_MOCK_FIXTURES.locations.length);
    expect(snapshot.counts.active).toBe(DEFAULT_MOCK_FIXTURES.activePackages.length);
    expect(snapshot.counts.inactive).toBe(DEFAULT_MOCK_FIXTURES.inactivePackages.length);
    expect(snapshot.counts.onHold).toBe(DEFAULT_MOCK_FIXTURES.onHoldPackages.length);
    // packagesByLocation must contain at least one location key (the default fixtures have packages at Fulfillment and Vault).
    const groupedKeys = Object.keys(snapshot.packagesByLocation);
    expect(groupedKeys.length).toBeGreaterThan(0);
    // every group entry is non-empty
    for (const k of groupedKeys) {
      expect(snapshot.packagesByLocation[k]!.length).toBeGreaterThan(0);
    }
  });
});
