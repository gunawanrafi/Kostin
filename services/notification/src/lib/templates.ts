import type { NotificationEventTypeValue } from "./validation.js";

export interface NotificationCopy {
  title: string;
  body: string;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

// Default title/body per supported event, filled in from the caller's
// `data` payload. POST /notifications/send may override either with an
// explicit title/body instead of using these.
const TEMPLATES: Record<NotificationEventTypeValue, (data: Record<string, unknown>) => NotificationCopy> = {
  BOOKING_CONFIRMED: (data) => ({
    title: "Booking Dikonfirmasi",
    body: `Booking Anda untuk ${str(data["listingTitle"], "kost pilihan Anda")} telah dikonfirmasi oleh pemilik.`,
  }),
  BOOKING_CANCELLED: (data) => ({
    title: "Booking Dibatalkan",
    body: `Booking Anda untuk ${str(data["listingTitle"], "kost pilihan Anda")} telah dibatalkan.`,
  }),
  PAYMENT_SUCCESS: (data) => ({
    title: "Pembayaran Berhasil",
    body: `Pembayaran sebesar Rp ${str(data["amount"], "-")} telah berhasil diproses.`,
  }),
  NEW_INQUIRY: (data) => ({
    title: "Pertanyaan Baru",
    body: `Anda menerima pertanyaan baru dari calon penyewa untuk ${str(data["listingTitle"], "properti Anda")}.`,
  }),
  OTP_REQUEST: () => ({
    title: "Kode OTP Diminta",
    body: "Kode verifikasi telah dikirim ke nomor WhatsApp Anda.",
  }),
};

export function renderNotificationCopy(
  eventType: NotificationEventTypeValue,
  data: Record<string, unknown>,
): NotificationCopy {
  return TEMPLATES[eventType](data);
}
