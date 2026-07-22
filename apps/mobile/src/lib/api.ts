import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse } from "@kostin/types";
import { useAuthStore, type AuthTokens, type AuthUser } from "../store/authStore";

// Direct per-service URLs for local dev — there's no API gateway deployed
// yet (see CLAUDE.md's "API Gateway" row, still Nginx/Kong TBD), so each
// service is hit directly. Set these in apps/mobile/.env; EXPO_PUBLIC_ is
// required for Expo to inline them into the client bundle.
const AUTH_URL = process.env["EXPO_PUBLIC_AUTH_URL"] ?? "http://localhost:3001";
const USER_URL = process.env["EXPO_PUBLIC_USER_URL"] ?? "http://localhost:3002";
const LISTING_URL = process.env["EXPO_PUBLIC_LISTING_URL"] ?? "http://localhost:3003";
const BOOKING_URL = process.env["EXPO_PUBLIC_BOOKING_URL"] ?? "http://localhost:3004";

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number | undefined;

  constructor(code: string, message: string, status: number | undefined) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

// Unwraps the { data, error, meta } envelope every service returns (see
// packages/types' ApiResponse) into a plain rejected/resolved value, so
// callers (React Query hooks) just get the payload or a thrown ApiRequestError.
function unwrapError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiResponse<unknown> | undefined;
    if (body?.error) {
      throw new ApiRequestError(body.error.code, body.error.message, error.response?.status);
    }
    throw new ApiRequestError("NETWORK_ERROR", error.message, error.response?.status);
  }
  throw error instanceof Error ? error : new Error("Unknown error");
}

let refreshPromise: Promise<string | null> | null = null;

// Calls POST /auth/refresh directly via plain axios (not one of the
// intercepted instances below) so this can never recursively trigger its
// own 401 handler. On failure, logs the store out — the caller's original
// request is then left rejected and screens fall back to the login route.
async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const res = await axios.post<ApiResponse<AuthTokens & { tokenType: string; expiresIn: number }>>(
      `${AUTH_URL}/auth/refresh`,
      { refreshToken },
    );
    const tokens = res.data.data;
    if (!tokens) return null;
    useAuthStore.getState().setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    return tokens.accessToken;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function createServiceClient(baseURL: string): AxiosInstance {
  const instance = axios.create({ baseURL, timeout: 15000 });

  instance.interceptors.request.use((config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryableConfig | undefined;

      if (error.response?.status === 401 && original && !original._retry) {
        original._retry = true;
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newToken = await refreshPromise;
        if (newToken) {
          original.headers.set("Authorization", `Bearer ${newToken}`);
          return instance(original);
        }
      }

      return Promise.reject(error);
    },
  );

  return instance;
}

export const authClient = createServiceClient(AUTH_URL);
export const userClient = createServiceClient(USER_URL);
export const listingClient = createServiceClient(LISTING_URL);
export const bookingClient = createServiceClient(BOOKING_URL);

// --- auth-service --------------------------------------------------------

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens & { tokenType: string; expiresIn: number };
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: "STUDENT" | "OWNER";
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface OtpVerifyInput {
  phone: string;
  code: string;
}

export interface OtpRequestInput {
  phone: string;
}

export const authApi = {
  async register(input: RegisterInput): Promise<AuthResult> {
    try {
      const res = await authClient.post<ApiResponse<AuthResult>>("/auth/register", input);
      return res.data.data!;
    } catch (err) {
      unwrapError(err);
    }
  },

  async login(input: LoginInput): Promise<AuthResult> {
    try {
      const res = await authClient.post<ApiResponse<AuthResult>>("/auth/login", input);
      return res.data.data!;
    } catch (err) {
      unwrapError(err);
    }
  },

  async requestOtp(input: OtpRequestInput): Promise<{ phone: string; expiresInSec: number }> {
    try {
      const res = await authClient.post<ApiResponse<{ phone: string; expiresInSec: number }>>(
        "/auth/otp/request",
        input,
      );
      return res.data.data!;
    } catch (err) {
      unwrapError(err);
    }
  },

  async verifyOtp(input: OtpVerifyInput): Promise<AuthResult> {
    try {
      const res = await authClient.post<ApiResponse<AuthResult>>("/auth/otp/verify", input);
      return res.data.data!;
    } catch (err) {
      unwrapError(err);
    }
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await authClient.post("/auth/logout", { refreshToken });
    } catch (err) {
      unwrapError(err);
    }
  },
};

// --- user-service ----------------------------------------------------------

export interface UserProfile extends AuthUser {
  bio: string | null;
  university: string | null;
  major: string | null;
  yearOfStudy: number | null;
  lifestyle: Record<string, unknown>;
  preferences: Record<string, unknown>;
}

export const userApi = {
  async getMe(): Promise<UserProfile> {
    try {
      const res = await userClient.get<ApiResponse<UserProfile>>("/users/me");
      return res.data.data!;
    } catch (err) {
      unwrapError(err);
    }
  },

  async updateMe(patch: Partial<Pick<UserProfile, "name" | "bio" | "university" | "major" | "yearOfStudy">>): Promise<UserProfile> {
    try {
      const res = await userClient.patch<ApiResponse<UserProfile>>("/users/me", patch);
      return res.data.data!;
    } catch (err) {
      unwrapError(err);
    }
  },

  // NOTE: no backend endpoint exists yet (no Favorite model, no route on
  // user-service) — this will 404 until that's built. Wired per spec so the
  // client side is ready the moment the backend lands.
  async getFavorites(): Promise<PublicListing[]> {
    try {
      const res = await userClient.get<ApiResponse<PublicListing[]>>("/users/me/favorites");
      return res.data.data ?? [];
    } catch (err) {
      unwrapError(err);
    }
  },
};

// --- listing-service ---------------------------------------------------------

export type Tipe = "PUTRA" | "PUTRI" | "CAMPUR";
export type ListingStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "PENDING_REVIEW";

export interface PublicListing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  address: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  lat: number;
  lng: number;
  tipe: Tipe;
  pricePerMonth: number;
  facilities: Record<string, unknown>;
  photos: string[];
  amenities: string[];
  rules: string[];
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  distanceKm?: number;
}

export interface ListingFilters {
  hargaMin?: number | undefined;
  hargaMax?: number | undefined;
  tipe?: Tipe | undefined;
  fasilitas?: string[] | undefined;
  status?: ListingStatus | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
}

export interface ListingPage {
  items: PublicListing[];
  nextCursor: string | null;
}

// Backend expects `fasilitas` as a single comma-separated string, not a
// repeated query param — join it here so callers can keep passing an array.
function toListingParams(filters: ListingFilters): Record<string, string | number> {
  const { fasilitas, ...rest } = filters;
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) params[key] = value;
  }
  if (fasilitas?.length) params["fasilitas"] = fasilitas.join(",");
  return params;
}

export const listingApi = {
  async list(filters: ListingFilters = {}): Promise<ListingPage> {
    try {
      const res = await listingClient.get<ApiResponse<PublicListing[]>>("/listings", {
        params: toListingParams(filters),
      });
      return { items: res.data.data ?? [], nextCursor: res.data.meta.nextCursor ?? null };
    } catch (err) {
      unwrapError(err);
    }
  },

  async search(query: string, filters: ListingFilters = {}): Promise<ListingPage> {
    try {
      const res = await listingClient.get<ApiResponse<PublicListing[]>>("/listings/search", {
        params: { q: query, ...toListingParams(filters) },
      });
      return { items: res.data.data ?? [], nextCursor: res.data.meta.nextCursor ?? null };
    } catch (err) {
      unwrapError(err);
    }
  },

  async getById(id: string): Promise<PublicListing> {
    try {
      const res = await listingClient.get<ApiResponse<PublicListing>>(`/listings/${id}`);
      return res.data.data!;
    } catch (err) {
      unwrapError(err);
    }
  },
};

// --- booking-service ---------------------------------------------------------

export interface CreateBookingInput {
  listingId: string;
  roomId?: string;
  checkIn: string;
  durationMonths: number;
  notes?: string;
}

export interface PublicBooking {
  id: string;
  listingId: string;
  roomId: string | null;
  studentId: string;
  ownerId: string;
  checkIn: string;
  checkOut: string;
  durationMonths: number;
  totalPrice: number;
  status: string;
  notes: string | null;
}

export const bookingApi = {
  async create(input: CreateBookingInput): Promise<PublicBooking> {
    try {
      const res = await bookingClient.post<ApiResponse<PublicBooking>>("/bookings", input);
      return res.data.data!;
    } catch (err) {
      unwrapError(err);
    }
  },
};
