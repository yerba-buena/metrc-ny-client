import { describe, it, expect, vi } from "vitest";
import { fetchAllPages } from "../src/transport/pagination.js";
import { MetrcResponseError } from "../src/errors.js";

interface Item { id: number; }

const envelope = (data: Item[], page: number, totalPages: number) => ({
  Data: data,
  Total: data.length * totalPages,
  TotalRecords: data.length * totalPages,
  PageSize: data.length,
  RecordsOnPage: data.length,
  Page: page,
  CurrentPage: page,
  TotalPages: totalPages,
});

describe("fetchAllPages", () => {
  it("returns the single page when TotalPages=1", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce(envelope([{ id: 1 }, { id: 2 }], 1, 1));
    const result = await fetchAllPages<Item>(fetchPage, "/test/v2/x");
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(1);
  });

  it("concatenates pages in order across multiple pages", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(envelope([{ id: 1 }], 1, 3))
      .mockResolvedValueOnce(envelope([{ id: 2 }], 2, 3))
      .mockResolvedValueOnce(envelope([{ id: 3 }], 3, 3));
    const result = await fetchAllPages<Item>(fetchPage, "/test/v2/x");
    expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("preserves all items from each page (no truncation)", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(envelope([{ id: 1 }, { id: 2 }], 1, 2))
      .mockResolvedValueOnce(envelope([{ id: 3 }, { id: 4 }], 2, 2));
    const result = await fetchAllPages<Item>(fetchPage, "/test/v2/x");
    expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
  });

  it("throws MetrcResponseError when envelope is malformed", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({ unexpected: "shape" });
    try {
      await fetchAllPages<Item>(fetchPage, "/transfers/v2/incoming");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(MetrcResponseError);
      expect((e as MetrcResponseError).endpoint).toBe("/transfers/v2/incoming");
    }
  });

  it("returns empty array when first page reports zero records", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce(envelope([], 1, 1));
    const result = await fetchAllPages<Item>(fetchPage, "/test/v2/x");
    expect(result).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
