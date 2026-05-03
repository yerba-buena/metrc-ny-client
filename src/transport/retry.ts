export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

export function computeBackoffMs(attempt: number, cfg: RetryConfig): number {
  const delay = cfg.initialDelayMs * Math.pow(cfg.backoffMultiplier, attempt);
  return Math.min(delay, cfg.maxDelayMs);
}

export function isRetryableStatus(status: number): boolean {
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}
