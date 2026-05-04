import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequester } from "../src/transport/request.js";
import {
  MetrcAuthError, MetrcClientError, MetrcRateLimitError, MetrcServerError, MetrcNetworkError
} from "../src/errors.js";
import { NOOP_LOGGER } from "../src/logger.js";

const baseConfig = {
  vendorApiKey: "vk", userApiKey: "uk", licenseNumber: "LIC-1",
  baseUrl: "https://example.test", logger: NOOP_LOGGER,
  rateLimitMs: 0,
  retry: { maxRetries: 2, initialDelayMs: 1, maxDelayMs: 1, backoffMultiplier: 1 },
};

function mockResponse(opts: { ok?: boolean; status?: number; body?: unknown; headers?: Record<string, string> }): Response {
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    headers: new Headers(opts.headers || {}),
    json: async () => opts.body ?? {},
    text: async () => JSON.stringify(opts.body ?? {}),
  } as Response;
}

describe("transport request", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("sends Basic Auth header with base64(vendor:user)", async () => {
    let captured: RequestInit | undefined;
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      captured = init;
      return mockResponse({ body: { Data: [], TotalPages: 1, CurrentPage: 1, RecordsOnPage: 0, Page: 1, PageSize: 20, Total: 0, TotalRecords: 0 } });
    });
    const req = createRequester({ ...baseConfig, fetch });
    await req("/x/v2/y", {});
    const expected = "Basic " + Buffer.from("vk:uk").toString("base64");
    expect((captured!.headers as Record<string, string>).Authorization).toBe(expected);
  });

  it("appends licenseNumber as query param", async () => {
    let capturedUrl = "";
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return mockResponse({ body: { Data: [], TotalPages: 1, CurrentPage: 1, RecordsOnPage: 0, Page: 1, PageSize: 20, Total: 0, TotalRecords: 0 } });
    });
    const req = createRequester({ ...baseConfig, fetch });
    await req("/x/v2/y", {});
    expect(capturedUrl).toContain("licenseNumber=LIC-1");
  });

  it("appends extra params on top of licenseNumber", async () => {
    let capturedUrl = "";
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return mockResponse({ body: { Data: [], TotalPages: 1, CurrentPage: 1, RecordsOnPage: 0, Page: 1, PageSize: 20, Total: 0, TotalRecords: 0 } });
    });
    const req = createRequester({ ...baseConfig, fetch });
    await req("/x/v2/y", { pageNumber: "2", pageSize: "20" });
    expect(capturedUrl).toContain("pageNumber=2");
    expect(capturedUrl).toContain("pageSize=20");
    expect(capturedUrl).toContain("licenseNumber=LIC-1");
  });

  it("composes the full URL from baseUrl + endpoint", async () => {
    let capturedUrl = "";
    const fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return mockResponse({ body: { Data: [], TotalPages: 1, CurrentPage: 1, RecordsOnPage: 0, Page: 1, PageSize: 20, Total: 0, TotalRecords: 0 } });
    });
    const req = createRequester({ ...baseConfig, baseUrl: "https://sandbox-api-ny.metrc.com", fetch });
    await req("/transfers/v2/incoming", {});
    expect(capturedUrl.startsWith("https://sandbox-api-ny.metrc.com/transfers/v2/incoming?")).toBe(true);
  });

  it("throws MetrcAuthError on 401", async () => {
    const fetch = vi.fn(async () => mockResponse({ ok: false, status: 401, body: "Unauthorized" }));
    const req = createRequester({ ...baseConfig, fetch });
    const promise = req("/x/v2/y", {});
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).rejects.toBeInstanceOf(MetrcAuthError);
  });

  it("throws MetrcAuthError on 403", async () => {
    const fetch = vi.fn(async () => mockResponse({ ok: false, status: 403, body: "Forbidden" }));
    const req = createRequester({ ...baseConfig, fetch });
    await expect(req("/x/v2/y", {})).rejects.toBeInstanceOf(MetrcAuthError);
  });

  it("throws MetrcClientError with status and truncated body on 404", async () => {
    const longBody = "x".repeat(2000);
    const fetch = vi.fn(async () => mockResponse({ ok: false, status: 404, body: longBody }));
    const req = createRequester({ ...baseConfig, fetch });
    try {
      await req("/x/v2/y", {});
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(MetrcClientError);
      const err = e as MetrcClientError;
      expect(err.status).toBe(404);
      expect(err.responseBody!.length).toBeLessThanOrEqual(500);
    }
  });

  it("retries on 429 with Retry-After then succeeds", async () => {
    let calls = 0;
    const fetch = vi.fn(async () => {
      calls++;
      if (calls === 1) return mockResponse({ ok: false, status: 429, headers: { "Retry-After": "1" }, body: "rate limited" });
      return mockResponse({ body: { Data: [{ id: 1 }], TotalPages: 1, CurrentPage: 1, RecordsOnPage: 1, Page: 1, PageSize: 20, Total: 1, TotalRecords: 1 } });
    });
    const req = createRequester({ ...baseConfig, fetch });
    const p = req<{ Data: { id: number }[] }>("/x/v2/y", {});
    await vi.advanceTimersByTimeAsync(2000);
    const result = await p;
    expect(calls).toBe(2);
    expect(result.Data).toEqual([{ id: 1 }]);
  });

  it("throws MetrcRateLimitError after max retries on 429", async () => {
    const fetch = vi.fn(async () => mockResponse({ ok: false, status: 429, headers: { "Retry-After": "1" }, body: "rate limited" }));
    const req = createRequester({ ...baseConfig, fetch });
    const p = req("/x/v2/y", {});
    await vi.advanceTimersByTimeAsync(20000);
    await expect(p).rejects.toBeInstanceOf(MetrcRateLimitError);
    expect(fetch.mock.calls.length).toBe(3); // 1 initial + 2 retries
  });

  it("retries on 500 then succeeds", async () => {
    let calls = 0;
    const fetch = vi.fn(async () => {
      calls++;
      if (calls === 1) return mockResponse({ ok: false, status: 500, body: "boom" });
      return mockResponse({ body: { Data: [], TotalPages: 1, CurrentPage: 1, RecordsOnPage: 0, Page: 1, PageSize: 20, Total: 0, TotalRecords: 0 } });
    });
    const req = createRequester({ ...baseConfig, fetch });
    const p = req("/x/v2/y", {});
    await vi.advanceTimersByTimeAsync(2000);
    await p;
    expect(calls).toBe(2);
  });

  it("throws MetrcServerError after max retries on 500", async () => {
    const fetch = vi.fn(async () => mockResponse({ ok: false, status: 503, body: "down" }));
    const req = createRequester({ ...baseConfig, fetch });
    const p = req("/x/v2/y", {});
    await vi.advanceTimersByTimeAsync(20000);
    await expect(p).rejects.toBeInstanceOf(MetrcServerError);
  });

  it("throws MetrcNetworkError after max retries on fetch rejection", async () => {
    const fetch = vi.fn(async () => { throw new TypeError("ECONNRESET"); });
    const req = createRequester({ ...baseConfig, fetch });
    const p = req("/x/v2/y", {});
    await vi.advanceTimersByTimeAsync(20000);
    await expect(p).rejects.toBeInstanceOf(MetrcNetworkError);
  });

  it("respects rate limiter spacing across calls", async () => {
    const timestamps: number[] = [];
    const fetch = vi.fn(async () => {
      timestamps.push(Date.now());
      return mockResponse({ body: { Data: [], TotalPages: 1, CurrentPage: 1, RecordsOnPage: 0, Page: 1, PageSize: 20, Total: 0, TotalRecords: 0 } });
    });
    const req = createRequester({ ...baseConfig, rateLimitMs: 200, fetch });
    const p = Promise.all([req("/a", {}), req("/b", {}), req("/c", {})]);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(200);
    await p;
    expect(timestamps.length).toBe(3);
    expect(timestamps[1]! - timestamps[0]!).toBeGreaterThanOrEqual(200);
    expect(timestamps[2]! - timestamps[1]!).toBeGreaterThanOrEqual(200);
  });
});
