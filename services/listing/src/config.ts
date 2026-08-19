export interface ListingConfig {
  port: number;
  host: string;
  corsOrigin: string;

  databaseUrl: string;

  // Must match auth-service's JWT_SECRET — access tokens are minted there
  // and verified here.
  jwtAccessSecret: string;

  defaultPageSize: number;
  maxPageSize: number;
  maxPhotosPerListing: number;
  maxPhotoUploadBytes: number;
  // Bounds B1's occupancy grid and stops a scripted caller creating rooms
  // without limit. Generous enough for any real kost in Malang.
  maxRoomsPerListing: number;

  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_PHOTOS_PER_LISTING = 20;
const MAX_PHOTO_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_ROOMS_PER_LISTING = 200;

function int(value: string | undefined, fallback: number): number {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// Reads process.env into a typed config object. Secrets fall back to dev
// defaults so `npm run dev`/tests work out of the box; production deploys
// must set JWT_SECRET / CLOUDINARY_* via the environment.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ListingConfig {
  return {
    port: int(env["PORT"], 3003),
    host: env["HOST"] ?? "0.0.0.0",
    corsOrigin: env["CORS_ORIGIN"] ?? "*",

    databaseUrl: env["DATABASE_URL"] ?? "",

    jwtAccessSecret: env["JWT_SECRET"] ?? "dev_access_secret_change_me",

    defaultPageSize: int(env["LISTING_DEFAULT_PAGE_SIZE"], DEFAULT_PAGE_SIZE),
    maxPageSize: int(env["LISTING_MAX_PAGE_SIZE"], MAX_PAGE_SIZE),
    maxPhotosPerListing: int(env["LISTING_MAX_PHOTOS"], MAX_PHOTOS_PER_LISTING),
    maxPhotoUploadBytes: int(env["LISTING_MAX_PHOTO_UPLOAD_BYTES"], MAX_PHOTO_UPLOAD_BYTES),
    maxRoomsPerListing: int(env["LISTING_MAX_ROOMS"], MAX_ROOMS_PER_LISTING),

    cloudinaryCloudName: env["CLOUDINARY_CLOUD_NAME"] ?? "",
    cloudinaryApiKey: env["CLOUDINARY_API_KEY"] ?? "",
    cloudinaryApiSecret: env["CLOUDINARY_API_SECRET"] ?? "",
  };
}
