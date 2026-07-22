import twilio from "twilio";

export interface OtpSender {
  sendWhatsappOtp(phone: string, code: string): Promise<void>;
}

// Real sender used in production. Uses Twilio's WhatsApp channel, per
// CLAUDE.md's "Twilio / ZenziVa — OTP via WhatsApp/SMS".
export class TwilioOtpSender implements OtpSender {
  private client: ReturnType<typeof twilio>;
  private from: string;

  constructor(accountSid: string, authToken: string, from: string) {
    this.client = twilio(accountSid, authToken);
    this.from = from;
  }

  async sendWhatsappOtp(phone: string, code: string): Promise<void> {
    await this.client.messages.create({
      from: this.from,
      to: `whatsapp:${phone}`,
      body: `KostIn: kode verifikasi Anda adalah ${code}. Berlaku 5 menit. Jangan bagikan kode ini kepada siapa pun.`,
    });
  }
}

// No-op sender for local dev / test environments without Twilio credentials.
export class NoopOtpSender implements OtpSender {
  async sendWhatsappOtp(): Promise<void> {
    // Intentionally does nothing — callers should not rely on OTPs
    // actually being delivered when this sender is active.
  }
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
