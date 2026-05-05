import { describe, it, expect } from "vitest";
import { NOOP_LOGGER } from "../src/logger.js";

describe("NOOP_LOGGER", () => {
  it("exposes debug/info/warn/error as no-op functions that return undefined", () => {
    expect(NOOP_LOGGER.debug("d")).toBeUndefined();
    expect(NOOP_LOGGER.info("i")).toBeUndefined();
    expect(NOOP_LOGGER.warn("w")).toBeUndefined();
    expect(NOOP_LOGGER.error("e")).toBeUndefined();
  });

  it("ignores meta arguments without throwing", () => {
    expect(() => NOOP_LOGGER.debug("msg", { k: 1 })).not.toThrow();
    expect(() => NOOP_LOGGER.info("msg", { k: 1 })).not.toThrow();
    expect(() => NOOP_LOGGER.warn("msg", new Error("x"))).not.toThrow();
    expect(() => NOOP_LOGGER.error("msg", "extra")).not.toThrow();
  });
});
