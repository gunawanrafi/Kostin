import type { RedisLike } from "./redis.js";
import type { BookingDraftInput } from "./validation.js";

// Session recovery: if a student exits mid-booking-flow (room -> date ->
// duration -> documents -> payment -> agreement), the client PUTs its
// current form state here after each step and GETs it back on return.
// Keyed by student+listing so a student can have one in-progress draft per
// listing at a time.
const draftKey = (userId: string, listingId: string): string => `booking-draft:${userId}:${listingId}`;

export interface StoredDraft extends BookingDraftInput {
  updatedAt: string;
}

export async function saveDraft(
  redis: RedisLike,
  userId: string,
  listingId: string,
  draft: BookingDraftInput,
  ttlSec: number,
): Promise<StoredDraft> {
  const stored: StoredDraft = { ...draft, updatedAt: new Date().toISOString() };
  await redis.set(draftKey(userId, listingId), JSON.stringify(stored), "EX", ttlSec);
  return stored;
}

export async function getDraft(
  redis: RedisLike,
  userId: string,
  listingId: string,
): Promise<StoredDraft | null> {
  const raw = await redis.get(draftKey(userId, listingId));
  if (!raw) return null;
  const parsed = JSON.parse(raw) as StoredDraft;
  return { ...parsed, checkIn: parsed.checkIn ? new Date(parsed.checkIn) : undefined };
}

export async function clearDraft(redis: RedisLike, userId: string, listingId: string): Promise<void> {
  await redis.del(draftKey(userId, listingId));
}
