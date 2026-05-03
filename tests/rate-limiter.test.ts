import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimiter } from "../src/transport/rate-limiter.js";

describe("RateLimiter", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("imposes minimum spacing between successive acquires", async () => {
    const limiter = new RateLimiter(200);
    const timestamps: number[] = [];

    const promises = [0, 1, 2].map(async () => {
      await limiter.acquire();
      timestamps.push(Date.now());
    });

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(200);

    await Promise.all(promises);

    expect(timestamps.length).toBe(3);
    expect(timestamps[1]! - timestamps[0]!).toBeGreaterThanOrEqual(200);
    expect(timestamps[2]! - timestamps[1]!).toBeGreaterThanOrEqual(200);
  });

  it("serializes concurrent acquires in call order", async () => {
    const limiter = new RateLimiter(50);
    const order: number[] = [];

    const p1 = limiter.acquire().then(() => order.push(1));
    const p2 = limiter.acquire().then(() => order.push(2));
    const p3 = limiter.acquire().then(() => order.push(3));

    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(50);

    await Promise.all([p1, p2, p3]);

    expect(order).toEqual([1, 2, 3]);
  });

  it("does not delay the first acquire from a fresh limiter beyond the configured spacing", async () => {
    const limiter = new RateLimiter(200);
    let acquired = false;

    const p = limiter.acquire().then(() => { acquired = true; });
    await vi.advanceTimersByTimeAsync(199);
    expect(acquired).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    await p;
    expect(acquired).toBe(true);
  });
});
