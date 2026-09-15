interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class Cache<T> {
  private entry: CacheEntry<T> | null = null;
  private refreshPromise: Promise<T> | null = null;

  constructor(
    private readonly ttlMs: number,
    private readonly staleAfterMs: number,
    private readonly fetchFn: () => Promise<T>
  ) {}

  async get(): Promise<T> {
    const now = Date.now();

    // No cache entry - fetch fresh
    if (!this.entry) {
      return this.refresh();
    }

    const age = now - this.entry.timestamp;

    // Cache is fresh - return it
    if (age < this.staleAfterMs) {
      return this.entry.value;
    }

    // Cache is stale but still valid (between staleAfterMs and ttlMs)
    // Return stale value but trigger background refresh
    if (age < this.ttlMs) {
      // If a refresh is already in progress, don't start another one
      if (this.refreshPromise) {
        return this.entry.value;
      }

      // Trigger background refresh
      this.triggerBackgroundRefresh();
      return this.entry.value;
    }

    // Cache has expired - wait for fresh data
    return this.refresh();
  }

  private async refresh(): Promise<T> {
    const value = await this.fetchFn();
    this.entry = {
      value,
      timestamp: Date.now(),
    };
    this.refreshPromise = null;
    return value;
  }

  private async triggerBackgroundRefresh(): Promise<void> {
    // Don't await the refresh - just start it
    this.refreshPromise = this.fetchFn().then((value) => {
      this.entry = {
        value,
        timestamp: Date.now(),
      };
      this.refreshPromise = null;
      return value;
    });

    // Handle errors in background refresh
    this.refreshPromise.catch((error) => {
      console.error("Background cache refresh failed:", error);
      this.refreshPromise = null;
    });
  }

  // Clear cache (optional, useful for testing)
  clear(): void {
    this.entry = null;
    this.refreshPromise = null;
  }
}

// Singleton cache instance for RSS feed
// TTL: 20 minutes, Stale after: 15 minutes
export const rssCache = new Cache<string>(
  20 * 60 * 1000, // 20 minutes TTL
  15 * 60 * 1000, // 15 minutes stale threshold
  async () => {
    const { getRss } = await import("./scrap");
    return getRss();
  }
);
