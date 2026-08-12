import type { ListingTipe } from "@/lib/types";
import { DEFAULT_COORDS, type KostFormState } from "./types";

const TYPE_LABEL_TO_TIPE: Record<string, ListingTipe> = {
  "Khusus Putri": "PUTRI",
  "Khusus Putra": "PUTRA",
  Campur: "CAMPUR",
};

// Fallback only when the owner clears/garbles the manual coordinate inputs —
// the wizard collects lat/lng directly (see StepInfoDasar), so the saved
// coordinate reflects owner intent rather than a silent hardcoded value.
const FALLBACK_LAT = Number(DEFAULT_COORDS.lat);
const FALLBACK_LNG = Number(DEFAULT_COORDS.lng);

function parseCoord(value: string, fallback: number): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

// "" means the owner left the field alone. Returning undefined (rather than 0)
// keeps that distinct on the wire: listing-service stores an omitted fee as
// NULL ("not charged"), while an explicit 0 means "charged, but free".
function optionalRupiah(digits: string): number | undefined {
  if (digits === "") return undefined;
  const n = Number(digits);
  return Number.isFinite(n) ? n : undefined;
}

// The "Aturan Tambahan" textarea is one rule per line; blank lines are
// dropped. Exported so the preview step lists exactly what will be sent.
export function parseAdditionalRules(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export interface CreateListingPayload {
  title: string;
  description: string;
  kelurahan: string;
  kecamatan: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  type: ListingTipe;
  pricePerMonth: number;
  amenities: string[];
  rules: string[];
  deposit: { enabled: boolean; amount?: number };
  paymentDuration: KostFormState["paymentDuration"];
  houseRules: KostFormState["houseRules"];
  additionalFees: {
    extraOccupant?: number;
    motorcycleParking?: number;
    carParking?: number;
  };
}

// Everything the wizard collected, in the shape POST /listings accepts.
// Previously this dropped deposit, rules, payment duration and fees on the
// floor — they were gathered by the form and never sent.
export function mapFormToCreateListingInput(form: KostFormState): CreateListingPayload {
  const depositAmount = optionalRupiah(form.deposit);
  const extraOccupant = optionalRupiah(form.feeExtraOccupant);
  const motorcycleParking = optionalRupiah(form.feeMotorcycleParking);
  const carParking = optionalRupiah(form.feeCarParking);

  return {
    title: form.name,
    description: form.description,
    address: form.address,
    // The wizard only collects one "district" field (labeled Kecamatan) —
    // reused for kelurahan too since there's no separate input for it.
    kelurahan: form.district,
    kecamatan: form.district,
    city: form.city,
    lat: parseCoord(form.lat, FALLBACK_LAT),
    lng: parseCoord(form.lng, FALLBACK_LNG),
    type: TYPE_LABEL_TO_TIPE[form.type] ?? "CAMPUR",
    pricePerMonth: Number(form.price) || 0,
    amenities: [...form.roomFacilities, ...form.sharedFacilities],
    rules: parseAdditionalRules(form.additionalRules),
    // `amount` is omitted when the toggle is off — depositSchema rejects
    // enabled-without-amount, and a disabled deposit stores NULL.
    deposit: {
      enabled: form.depositEnabled,
      ...(form.depositEnabled && depositAmount !== undefined ? { amount: depositAmount } : {}),
    },
    paymentDuration: form.paymentDuration,
    houseRules: form.houseRules,
    additionalFees: {
      ...(extraOccupant !== undefined ? { extraOccupant } : {}),
      ...(motorcycleParking !== undefined ? { motorcycleParking } : {}),
      ...(carParking !== undefined ? { carParking } : {}),
    },
  };
}
