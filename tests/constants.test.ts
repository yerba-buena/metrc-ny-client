import { describe, it, expect } from "vitest";
import { NY_PROD_BASE_URL, NY_SANDBOX_BASE_URL } from "../src/constants.js";

describe("constants", () => {
  it("NY_PROD_BASE_URL points at api-ny.metrc.com over https", () => {
    expect(NY_PROD_BASE_URL).toBe("https://api-ny.metrc.com");
  });
  it("NY_SANDBOX_BASE_URL points at sandbox-api-ny.metrc.com over https", () => {
    expect(NY_SANDBOX_BASE_URL).toBe("https://sandbox-api-ny.metrc.com");
  });
});
