import { describe, it, expect } from "vitest";
import { computeBackoffMs, isRetryableStatus, DEFAULT_RETRY_CONFIG } from "../src/transport/retry.js";

describe("computeBackoffMs", () => {
  it("returns initialDelayMs on attempt 0", () => {
    expect(computeBackoffMs(0, DEFAULT_RETRY_CONFIG)).toBe(1000);
  });
  it("doubles each attempt up to maxDelayMs", () => {
    expect(computeBackoffMs(1, DEFAULT_RETRY_CONFIG)).toBe(2000);
    expect(computeBackoffMs(2, DEFAULT_RETRY_CONFIG)).toBe(4000);
    expect(computeBackoffMs(3, DEFAULT_RETRY_CONFIG)).toBe(8000);
  });
  it("caps at maxDelayMs", () => {
    expect(computeBackoffMs(10, DEFAULT_RETRY_CONFIG)).toBe(10000);
  });
});

describe("isRetryableStatus", () => {
  it("returns true for 429", () => { expect(isRetryableStatus(429)).toBe(true); });
  it("returns true for 5xx", () => {
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(502)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(599)).toBe(true);
  });
  it("returns false for non-429 4xx", () => {
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(403)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
  });
  it("returns false for 2xx and 3xx", () => {
    expect(isRetryableStatus(200)).toBe(false);
    expect(isRetryableStatus(301)).toBe(false);
  });
});
