import admin from "firebase-admin";

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Narrow surface of Firebase Admin's messaging API actually used here, so
// tests/the HTTP layer can inject a fake instead of calling real FCM.
export interface PushSender {
  send(message: PushMessage): Promise<void>;
}

export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export class FirebasePushSender implements PushSender {
  private readonly app: admin.app.App;

  constructor(config: FirebaseConfig) {
    this.app = admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          // .env stores literal "\n" escapes; real newlines are required by the SDK.
          privateKey: config.privateKey.replace(/\\n/g, "\n"),
        }),
      },
      `notification-service-${Date.now()}`,
    );
  }

  async send(message: PushMessage): Promise<void> {
    await this.app.messaging().send({
      token: message.token,
      notification: { title: message.title, body: message.body },
      ...(message.data ? { data: message.data } : {}),
    });
  }
}

// Used when FIREBASE_* env vars aren't configured (local/dev, or CI) —
// notifications still persist and are readable via GET /notifications, they
// just aren't pushed to a device. Mirrors auth-service's NoopOtpSender.
export class NoopPushSender implements PushSender {
  async send(_message: PushMessage): Promise<void> {
    // No FCM credentials configured — intentionally a no-op.
  }
}
