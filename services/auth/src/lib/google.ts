import { OAuth2Client } from "google-auth-library";
import { AppError, AuthErrorCode } from "./errors.js";

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface GoogleVerifier {
  verifyIdToken(idToken: string): Promise<GoogleProfile>;
}

export class GoogleOAuthVerifier implements GoogleVerifier {
  private client: OAuth2Client;
  private clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.client = new OAuth2Client(clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new AppError(401, AuthErrorCode.GOOGLE_TOKEN_INVALID, "Invalid Google ID token");
    }

    if (!payload?.sub || !payload.email) {
      throw new AppError(401, AuthErrorCode.GOOGLE_TOKEN_INVALID, "Google token missing required claims");
    }
    if (!payload.email_verified) {
      throw new AppError(401, AuthErrorCode.GOOGLE_TOKEN_INVALID, "Google email is not verified");
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email.split("@")[0] ?? "KostIn User",
      ...(payload.picture ? { avatarUrl: payload.picture } : {}),
    };
  }
}
