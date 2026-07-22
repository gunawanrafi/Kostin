// Minimal surface of ioredis actually used by this service. Defining it as
// an interface (rather than importing ioredis's Redis type directly) lets
// tests inject a tiny in-memory fake instead of a real Redis connection.
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttlSec: number): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSec: number): Promise<number>;
  ttl(key: string): Promise<number>;
}

interface Entry {
  value: string;
  expiresAt: number | null;
}

// In-memory RedisLike used by unit tests so no real Redis instance is
// required. Expiry is checked lazily on read/write (no real timers), and
// `now` is injectable so tests can simulate TTL expiry deterministically.
export class InMemoryRedis implements RedisLike {
  private store = new Map<string, Entry>();
  private now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  private isExpired(entry: Entry): boolean {
    return entry.expiresAt !== null && entry.expiresAt <= this.now();
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
    this.store.set(key, { value, expiresAt: this.now() + ttlSec * 1000 });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count += 1;
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    const current = this.read(key);
    const next = (current ? parseInt(current.value, 10) : 0) + 1;
    this.store.set(key, { value: String(next), expiresAt: current?.expiresAt ?? null });
    return next;
  }

  async expire(key: string, ttlSec: number): Promise<number> {
    const entry = this.read(key);
    if (!entry) return 0;
    entry.expiresAt = this.now() + ttlSec * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.read(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    return Math.max(0, Math.round((entry.expiresAt - this.now()) / 1000));
  }
}
