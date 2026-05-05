import { RateLimiter } from "./rate-limiter.js";
import { DEFAULT_RETRY_CONFIG, computeBackoffMs, isRetryableStatus, type RetryConfig } from "./retry.js";
import {
  MetrcAuthError, MetrcClientError, MetrcRateLimitError,
  MetrcServerError, MetrcNetworkError,
} from "../errors.js";
import type { Logger } from "../logger.js";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface RequesterConfig {
  vendorApiKey: string;
  userApiKey: string;
  licenseNumber: string;
  baseUrl: string;
  logger: Logger;
  fetch?: FetchLike;
  rateLimitMs?: number;
  retry?: Partial<RetryConfig>;
}

export type Requester = <T>(endpoint: string, params: Record<string, string>) => Promise<T>;

function buildAuthHeader(vendorKey: string, userKey: string): string {
  const creds = `${vendorKey}:${userKey}`;
  return `Basic ${Buffer.from(creds).toString("base64")}`;
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

export function createRequester(cfg: RequesterConfig): Requester {
  const fetchImpl: FetchLike = cfg.fetch ?? ((url, init) => globalThis.fetch(url, init));
  const rateLimitMs = cfg.rateLimitMs ?? 200;
  const rateLimit = rateLimitMs > 0 ? new RateLimiter(rateLimitMs) : undefined;
  const retryCfg: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...cfg.retry };
  const auth = buildAuthHeader(cfg.vendorApiKey, cfg.userApiKey);

  return async function request<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retryCfg.maxRetries; attempt++) {
      if (rateLimit) await rateLimit.acquire();

      const url = new URL(`${cfg.baseUrl}${endpoint}`);
      url.searchParams.append("licenseNumber", cfg.licenseNumber);
      for (const [k, v] of Object.entries(params)) url.searchParams.append(k, v);

      cfg.logger.debug(`[METRC] ${attempt > 0 ? `retry ${attempt} ` : ""}${endpoint}`);

      let response: Response;
      try {
        response = await fetchImpl(url.toString(), {
          method: "GET",
          headers: { Authorization: auth, "Content-Type": "application/json" },
        });
      } catch (err) {
        lastError = err;
        if (attempt < retryCfg.maxRetries) {
          const delay = computeBackoffMs(attempt, retryCfg);
          cfg.logger.warn(`[METRC] network error on ${endpoint}; retrying in ${delay}ms`, err);
          await sleep(delay);
          continue;
        }
        throw new MetrcNetworkError(
          err instanceof Error ? err.message : String(err),
          { endpoint, method: "GET", cause: err },
        );
      }

      if (response.ok) return (await response.json()) as T;

      const status = response.status;
      const bodyText = await response.text().catch(() => "");

      if (status === 401 || status === 403) {
        throw new MetrcAuthError(`METRC auth failed: ${status}`, { endpoint, method: "GET" });
      }

      if (status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
        if (attempt < retryCfg.maxRetries) {
          const delay = retryAfterSeconds !== undefined
            ? retryAfterSeconds * 1000
            : computeBackoffMs(attempt, retryCfg);
          cfg.logger.warn(`[METRC] rate-limited on ${endpoint}; waiting ${delay}ms`);
          await sleep(delay);
          continue;
        }
        throw new MetrcRateLimitError("METRC rate limit retries exhausted", {
          endpoint, method: "GET", retryAfterSeconds,
        });
      }

      if (isRetryableStatus(status)) {
        if (attempt < retryCfg.maxRetries) {
          const delay = computeBackoffMs(attempt, retryCfg);
          cfg.logger.warn(`[METRC] ${status} on ${endpoint}; retrying in ${delay}ms`);
          await sleep(delay);
          continue;
        }
        throw new MetrcServerError(`METRC server error: ${status}`, {
          endpoint, method: "GET", status,
        });
      }

      // Other 4xx — non-retryable
      throw new MetrcClientError(`METRC client error: ${status}`, {
        endpoint, method: "GET", status, responseBody: bodyText,
      });
    }
    // Unreachable: the loop always returns on success or throws on failure.
    // Kept as a TS-narrowed fallthrough to satisfy the `Promise<T>` return type.
    /* c8 ignore next */
    throw lastError instanceof Error ? lastError : new Error("METRC request failed");
  };
}
