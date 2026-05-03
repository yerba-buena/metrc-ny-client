interface BaseOpts { endpoint: string; method: string; cause?: unknown; }

export class MetrcError extends Error {
  readonly endpoint: string;
  readonly method: string;
  override readonly cause?: unknown;
  constructor(message: string, opts: BaseOpts) {
    super(message);
    this.name = "MetrcError";
    this.endpoint = opts.endpoint;
    this.method = opts.method;
    this.cause = opts.cause;
  }
}

export class MetrcAuthError extends MetrcError {
  constructor(message: string, opts: BaseOpts) {
    super(message, opts);
    this.name = "MetrcAuthError";
  }
}

export class MetrcClientError extends MetrcError {
  readonly status: number;
  readonly responseBody?: string;
  constructor(message: string, opts: BaseOpts & { status: number; responseBody?: string }) {
    super(message, opts);
    this.name = "MetrcClientError";
    this.status = opts.status;
    this.responseBody = opts.responseBody?.slice(0, 500);
  }
}

export class MetrcRateLimitError extends MetrcError {
  readonly retryAfterSeconds?: number;
  constructor(message: string, opts: BaseOpts & { retryAfterSeconds?: number }) {
    super(message, opts);
    this.name = "MetrcRateLimitError";
    this.retryAfterSeconds = opts.retryAfterSeconds;
  }
}

export class MetrcServerError extends MetrcError {
  readonly status: number;
  constructor(message: string, opts: BaseOpts & { status: number }) {
    super(message, opts);
    this.name = "MetrcServerError";
    this.status = opts.status;
  }
}

export class MetrcNetworkError extends MetrcError {
  constructor(message: string, opts: BaseOpts) {
    super(message, opts);
    this.name = "MetrcNetworkError";
  }
}

export class MetrcResponseError extends MetrcError {
  constructor(message: string, opts: BaseOpts) {
    super(message, opts);
    this.name = "MetrcResponseError";
  }
}
