// BullMQ bundles its own nested copy of ioredis, which TypeScript treats as
// a nominally different type from the top-level `ioredis` this service
// depends on directly (exactOptionalPropertyTypes makes the mismatch a hard
// error). Passing plain connection options — rather than a constructed
// ioredis instance — sidesteps that entirely: BullMQ builds its own client
// from its own bundled ioredis.
export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export function parseRedisConnectionOptions(url: string): RedisConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
    ...(parsed.username ? { username: parsed.username } : {}),
    ...(parsed.password ? { password: parsed.password } : {}),
  };
}

// Minimal surface of ioredis actually used by this service. Defining it as
// an interface (rather than importing ioredis's Redis type directly) lets
// tests inject a tiny in-memory fake instead of a real Redis connection.
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttlSec: number): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
}

interface Entry {
  value: string;
  expiresAt: number | null;
}

// In-memory RedisLike used by unit tests so no real Redis instance is
// required. Expiry is checked lazily on read/write (no real timers).
export class InMemoryRedis implements RedisLike {
  private store = new Map<string, Entry>();

  private isExpired(entry: Entry): boolean {
    return entry.expiresAt !== null && entry.expiresAt <= Date.now();
  }

  private read(key: string): Entry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  async get(key: string): Promise<string | null> {
    return this.read(key)?.value ?? null;
  }

  async set(key: string, value: string, _mode: "EX", ttlSec: number): Promise<"OK"> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count += 1;
    }
    return count;
  }
}
