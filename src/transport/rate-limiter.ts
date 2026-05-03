function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RateLimiter {
  private queue: Promise<void> = Promise.resolve();
  constructor(private readonly minDelayMs: number) {}

  async acquire(): Promise<void> {
    const myTurn = this.queue;
    let releaseNext!: () => void;
    this.queue = new Promise<void>((resolve) => { releaseNext = resolve; });
    await myTurn;
    await sleep(this.minDelayMs);
    releaseNext();
  }
}
