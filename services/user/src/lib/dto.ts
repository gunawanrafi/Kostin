import type { User, UserProfile } from "@kostin/database";

export interface Lifestyle {
  sleepTime: "early" | "late";
  noiseLevel: "quiet" | "moderate" | "loud";
  smoking: boolean;
  pets: boolean;
  guests: "never" | "occasionally" | "frequently";
  cleaningFreq: "daily" | "weekly" | "monthly";
}

export interface Preferences {
  maxBudget?: number;
  preferredAreas?: string[];
  amenities?: string[];
  roomTypes?: string[];
}

// Owner screening preferences (D3). Mirrors screeningCriteriaSchema.
export interface ScreeningCriteria {
  minDurationMonths: number;
  requireVerifiedAccount: boolean;
  requireKtm: boolean;
  requireKtp: boolean;
  allowSmoking: boolean;
  allowPets: boolean;
  preferredUniversities: string[];
  notes: string;
}

// What an owner who has never saved criteria gets from GET. Permissive on
// purpose — defaults that filtered applicants out would hide real applications
// from an owner who never asked for that.
export const DEFAULT_SCREENING_CRITERIA: ScreeningCriteria = {
  minDurationMonths: 1,
  requireVerifiedAccount: false,
  requireKtm: false,
  requireKtp: false,
  allowSmoking: true,
  allowPets: true,
  preferredUniversities: [],
  notes: "",
};

// The stored column is Json and can predate any change to the shape above, so
// each field is taken only when it's the right type and defaulted otherwise —
// a half-written blob degrades to defaults rather than reaching the client as
// the wrong type.
export function toScreeningCriteria(stored: unknown): ScreeningCriteria {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return { ...DEFAULT_SCREENING_CRITERIA };
  }
  const raw = stored as Record<string, unknown>;
  const bool = (key: keyof ScreeningCriteria): boolean =>
    typeof raw[key] === "boolean" ? (raw[key] as boolean) : (DEFAULT_SCREENING_CRITERIA[key] as boolean);

  return {
    minDurationMonths:
      typeof raw["minDurationMonths"] === "number" && Number.isInteger(raw["minDurationMonths"])
        ? (raw["minDurationMonths"] as number)
        : DEFAULT_SCREENING_CRITERIA.minDurationMonths,
    requireVerifiedAccount: bool("requireVerifiedAccount"),
    requireKtm: bool("requireKtm"),
    requireKtp: bool("requireKtp"),
    allowSmoking: bool("allowSmoking"),
    allowPets: bool("allowPets"),
    preferredUniversities: Array.isArray(raw["preferredUniversities"])
      ? (raw["preferredUniversities"] as unknown[]).filter((v): v is string => typeof v === "string")
      : [],
    notes: typeof raw["notes"] === "string" ? raw["notes"] : "",
  };
}

// Never includes passwordHash/googleId — this is what crosses the wire.
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  bio: string | null;
  university: string | null;
  major: string | null;
  yearOfStudy: number | null;
  lifestyle: Partial<Lifestyle>;
  preferences: Preferences;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicUser(user: User, profile: UserProfile | null): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    bio: profile?.bio ?? null,
    university: profile?.university ?? null,
    major: profile?.major ?? null,
    yearOfStudy: profile?.yearOfStudy ?? null,
    lifestyle: (profile?.lifestyle as Partial<Lifestyle> | undefined) ?? {},
    preferences: (profile?.preferences as Preferences | undefined) ?? {},
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
