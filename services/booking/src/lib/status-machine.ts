import type { BookingStatus } from "@kostin/database";

// Full lifecycle (schema-level): PENDING -> CONFIRMED -> ACTIVE -> COMPLETED,
// with CANCELLED reachable from PENDING or CONFIRMED. Only the two
// transitions below are exposed by this service's endpoints — ACTIVE/
// COMPLETED are driven by other services (check-in date, payment) in a
// later phase and aren't reachable here.
const CONFIRMABLE_FROM: readonly BookingStatus[] = ["PENDING"];
const CANCELLABLE_FROM: readonly BookingStatus[] = ["PENDING", "CONFIRMED"];

export function canConfirm(status: BookingStatus): boolean {
  return CONFIRMABLE_FROM.includes(status);
}

export function canCancel(status: BookingStatus): boolean {
  return CANCELLABLE_FROM.includes(status);
}
