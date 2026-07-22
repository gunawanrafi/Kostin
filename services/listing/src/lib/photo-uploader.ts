import { v2 as cloudinary } from "cloudinary";

export interface PhotoUploadResult {
  url: string;
}

// Narrow surface of Cloudinary actually used by the photo-upload route, so
// tests can inject a fake instead of making real network calls.
export interface PhotoUploader {
  upload(buffer: Buffer, listingId: string, index: number): Promise<PhotoUploadResult>;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryPhotoUploader implements PhotoUploader {
  constructor(config: CloudinaryConfig) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });
  }

  async upload(buffer: Buffer, listingId: string, index: number): Promise<PhotoUploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `kostin/listings/${listingId}`,
          public_id: `${Date.now()}-${index}`,
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
