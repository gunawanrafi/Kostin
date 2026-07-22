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
