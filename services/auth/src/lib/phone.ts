// Normalizes Indonesian phone numbers to E.164 (+62...) so the same value is
// used consistently as a Prisma lookup key, a Redis key, and a Twilio
// WhatsApp destination.
export function normalizePhone(raw: string): string {
  const digits = raw.trim().replace(/[\s-()]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  return `+62${digits}`;
}
