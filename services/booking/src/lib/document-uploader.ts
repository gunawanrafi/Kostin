import { v2 as cloudinary } from "cloudinary";

export interface DocumentUploadResult {
  url: string;
}

// Narrow surface of Cloudinary actually used by the document-upload route,
// so tests can inject a fake instead of making real network calls.
export interface DocumentUploader {
  upload(buffer: Buffer, bookingId: string, documentType: "KTM" | "KTP"): Promise<DocumentUploadResult>;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryDocumentUploader implements DocumentUploader {
  constructor(config: CloudinaryConfig) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });
  }

  async upload(buffer: Buffer, bookingId: string, documentType: "KTM" | "KTP"): Promise<DocumentUploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          // Identity documents — kept out of the public listing-photo
          // folders and not exposed via delivery URL transformations.
          folder: `kostin/bookings/${bookingId}/documents`,
          public_id: documentType,
          overwrite: true,
          resource_type: "image",
          type: "authenticated",
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
