// BullMQ bundles its own nested copy of ioredis, which TypeScript treats as
// a nominally different type from a top-level `ioredis` instance under
// exactOptionalPropertyTypes. Passing plain connection options — rather than
// a constructed ioredis instance — sidesteps that: BullMQ builds its own
// client from its own bundled ioredis.
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
