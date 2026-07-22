import { v2 as cloudinary } from "cloudinary";

export interface AvatarUploadResult {
  url: string;
}

// Narrow surface of Cloudinary actually used by the avatar route, so tests
// can inject a fake instead of making real network calls.
export interface AvatarUploader {
  upload(buffer: Buffer, userId: string): Promise<AvatarUploadResult>;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryAvatarUploader implements AvatarUploader {
  constructor(config: CloudinaryConfig) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });
  }

  async upload(buffer: Buffer, userId: string): Promise<AvatarUploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "kostin/avatars",
          public_id: userId,
          overwrite: true,
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload returned no result"));
            return;
          }
          resolve({ url: result.secure_url });
        },
      );
      stream.end(buffer);
    });
  }
}
