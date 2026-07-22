import { AppError, ListingErrorCode } from "./errors.js";

// Opaque cursor for keyset pagination: `v` is the sort key's value at the
// last-seen row (ISO date string for the default listing, a number for
// distanceKm/rank ordering), `id` breaks ties so pagination stays stable
// even when many rows share the same `v`.
export interface Cursor {
  v: string | number;
  id: string;
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(raw: string): Cursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("v" in parsed) ||
      !("id" in parsed) ||
      typeof (parsed as Cursor).id !== "string" ||
      (typeof (parsed as Cursor).v !== "string" && typeof (parsed as Cursor).v !== "number")
    ) {
      throw new Error("shape mismatch");
    }
    return parsed as Cursor;
  } catch {
    throw new AppError(400, ListingErrorCode.INVALID_CURSOR, "Invalid or corrupted cursor");
  }
}
