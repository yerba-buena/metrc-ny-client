import { describe, it, expect } from "vitest";
import {
  MetrcError, MetrcAuthError, MetrcClientError, MetrcRateLimitError,
  MetrcServerError, MetrcNetworkError, MetrcResponseError
} from "../src/errors.js";

describe("error types", () => {
  it("MetrcError carries endpoint, method, and cause", () => {
    const cause = new Error("inner");
    const err = new MetrcError("boom", { endpoint: "/x/v2/y", method: "GET", cause });
    expect(err.message).toBe("boom");
    expect(err.endpoint).toBe("/x/v2/y");
    expect(err.method).toBe("GET");
    expect(err.cause).toBe(cause);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("MetrcError");
  });

  it("MetrcAuthError extends MetrcError", () => {
    const err = new MetrcAuthError("401", { endpoint: "/x", method: "GET" });
    expect(err).toBeInstanceOf(MetrcError);
    expect(err.name).toBe("MetrcAuthError");
  });

  it("MetrcClientError carries status and truncated responseBody", () => {
    const longBody = "x".repeat(2000);
    const err = new MetrcClientError("404", {
      endpoint: "/x", method: "GET", status: 404, responseBody: longBody
    });
    expect(err.status).toBe(404);
    expect(err.responseBody).toBeDefined();
    expect(err.responseBody!.length).toBeLessThanOrEqual(500);
  });

  it("MetrcRateLimitError carries retryAfterSeconds", () => {
    const err = new MetrcRateLimitError("429", {
      endpoint: "/x", method: "GET", retryAfterSeconds: 5
    });
    expect(err.retryAfterSeconds).toBe(5);
  });

  it("MetrcServerError carries status", () => {
    const err = new MetrcServerError("503", { endpoint: "/x", method: "GET", status: 503 });
    expect(err.status).toBe(503);
  });

  it("MetrcNetworkError extends MetrcError", () => {
    const err = new MetrcNetworkError("network", { endpoint: "/x", method: "GET" });
    expect(err).toBeInstanceOf(MetrcError);
  });

  it("MetrcResponseError extends MetrcError", () => {
    const err = new MetrcResponseError("bad shape", { endpoint: "/x", method: "GET" });
    expect(err).toBeInstanceOf(MetrcError);
  });
});
