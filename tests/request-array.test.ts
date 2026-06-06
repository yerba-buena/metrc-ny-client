import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequester } from "../src/transport/request.js";
import { requestArray } from "../src/transport/request-array.js";
import { MetrcResponseError } from "../src/errors.js";
import { NOOP_LOGGER } from "../src/logger.js";

const baseConfig = {
  vendorApiKey: "vk",
  userApiKey: "uk",
  licenseNumber: "LIC",
  baseUrl: "https://example.test",
  logger: NOOP_LOGGER,
  rateLimitMs: 0,
  retry: {
    maxRetries: 0,
    initialDelayMs: 1,
    maxDelayMs: 1,
    backoffMultiplier: 1,
  },
};

const mockResponse = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
    text: async () => "",
  }) as unknown as Response;

describe("requestArray", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the bare array unchanged when the response IS an array", async () => {
    const fetch = vi.fn(async () => mockResponse(["Product", "ImmaturePlant", "VegetativePlant"]));
    const req = createRequester({ ...baseConfig, fetch });
    const result = await requestArray<string>(req, "/packages/v2/types");
    expect(result).toEqual(["Product", "ImmaturePlant", "VegetativePlant"]);
  });

  it("throws MetrcResponseError when the response is an envelope, not an array", async () => {
    const fetch = vi.fn(async () => mockResponse({ Data: ["foo"], TotalPages: 1 }));
    const req = createRequester({ ...baseConfig, fetch });
    await expect(requestArray<string>(req, "/packages/v2/types")).rejects.toBeInstanceOf(
      MetrcResponseError,
    );
  });

  it("throws MetrcResponseError when the response is null", async () => {
    const fetch = vi.fn(async () => mockResponse(null));
    const req = createRequester({ ...baseConfig, fetch });
    await expect(requestArray<string>(req, "/packages/v2/types")).rejects.toBeInstanceOf(
      MetrcResponseError,
    );
  });

  it("attaches the endpoint path to the MetrcResponseError", async () => {
    const fetch = vi.fn(async () => mockResponse({ unexpected: "shape" }));
    const req = createRequester({ ...baseConfig, fetch });
    let caught: unknown;
    await requestArray<string>(req, "/packages/v2/types").catch((e) => {
      caught = e;
    });
    expect(caught).toBeInstanceOf(MetrcResponseError);
    expect((caught as MetrcResponseError).endpoint).toBe("/packages/v2/types");
  });
});
