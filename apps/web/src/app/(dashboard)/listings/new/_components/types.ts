export interface WizardPhoto {
  id: string;
  url: string;
  name: string;
  // The actual File is kept (not just the object-URL preview) so it can be
  // uploaded to listing-service's POST /listings/:id/photos after the listing
  // is created.
  file: File;
}

// Malang city-center — the default map coordinate until a real map picker
// exists (Phase 2). Owners can override lat/lng manually in Step 1.
export const DEFAULT_COORDS = { lat: "-7.9666", lng: "112.6326" };

// Mirrors listing-service's PaymentDuration enum.
export type PaymentDuration = "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL";

export const PAYMENT_DURATION_OPTIONS: { value: PaymentDuration; label: string }[] = [
  { value: "MONTHLY", label: "Bulanan" },
  { value: "QUARTERLY", label: "3 Bulan (Triwulan)" },
  { value: "SEMIANNUAL", label: "6 Bulan (Semester)" },
  { value: "ANNUAL", label: "12 Bulan (Tahunan)" },
];

// The five fixed toggles from the C5 artboard, keyed exactly as
// listing-service's houseRulesSchema expects.
export interface HouseRulesState {
  access24Hours: boolean;
  overnightGuestsAllowed: boolean;
  oppositeGenderProhibited: boolean;
  petsProhibited: boolean;
  smokingProhibited: boolean;
}

// `label` is the design's copy. `positive` marks a rule phrased as a
// permission rather than a prohibition — the UI tints those differently so
// "on" always reads as "this is the house's position", not "this is banned".
export const HOUSE_RULE_OPTIONS: {
  key: keyof HouseRulesState;
  label: string;
  hint: string;
  positive: boolean;
}[] = [
  {
    key: "access24Hours",
    label: "Akses 24 Jam",
    hint: "Penghuni bisa keluar-masuk kapan saja.",
    positive: true,
  },
  {
    key: "overnightGuestsAllowed",
    label: "Boleh Bawa Tamu Menginap",
    hint: "Tamu boleh menginap dengan sepengetahuan pemilik.",
    positive: true,
  },
  {
    key: "oppositeGenderProhibited",
    label: "Lawan Jenis Dilarang Masuk Kamar",
    hint: "Tamu lawan jenis hanya boleh di ruang bersama.",
    positive: false,
  },
  {
    key: "petsProhibited",
    label: "Dilarang Bawa Hewan",
    hint: "Hewan peliharaan tidak diizinkan di area kost.",
    positive: false,
  },
  {
    key: "smokingProhibited",
    label: "Dilarang Merokok",
    hint: "Merokok dilarang di dalam kamar dan area dalam.",
    positive: false,
  },
];

export interface KostFormState {
  name: string;
  type: string;
  description: string;
  address: string;
  city: string;
  district: string;
  lat: string;
  lng: string;
  roomFacilities: string[];
  sharedFacilities: string[];
  unitCount: string;
  capacity: string;
  mainPhoto: WizardPhoto | null;
  roomPhotos: WizardPhoto[];

  // ── Step 4 · Harga & Aturan ──────────────────────────────────────────────
  // Money fields are kept as digit-only strings so the inputs stay
  // controlled and empty ("belum diisi") is distinguishable from 0.
  price: string;
  depositEnabled: boolean;
  deposit: string;
  paymentDuration: PaymentDuration;
  houseRules: HouseRulesState;
  additionalRules: string;
  feeExtraOccupant: string;
  feeMotorcycleParking: string;
  feeCarParking: string;
}

export const INITIAL_FORM_STATE: KostFormState = {
  name: "",
  type: "Khusus Putri",
  description: "",
  address: "",
  city: "Malang",
  district: "Lowokwaru",
  lat: DEFAULT_COORDS.lat,
  lng: DEFAULT_COORDS.lng,
  roomFacilities: [],
  sharedFacilities: [],
  unitCount: "",
  capacity: "1",
  mainPhoto: null,
  roomPhotos: [],
  price: "",
  depositEnabled: false,
  deposit: "",
  paymentDuration: "MONTHLY",
  houseRules: {
    access24Hours: false,
    overnightGuestsAllowed: false,
    oppositeGenderProhibited: false,
    petsProhibited: false,
    smokingProhibited: false,
  },
  additionalRules: "",
  feeExtraOccupant: "",
  feeMotorcycleParking: "",
  feeCarParking: "",
};

// Step 4 is "Harga & Aturan" per design C5; preview keeps its own step rather
// than displacing it (the old wizard labelled step 4 "Preview & Publish" and
// collected only a price).
export const STEP_LABELS = [
  "Info Dasar",
  "Fasilitas",
  "Foto & Media",
  "Harga & Aturan",
  "Preview & Publish",
];

export const ROOM_FACILITY_OPTIONS = ["AC", "Wi-Fi", "Kasur & Lemari", "Meja Belajar", "Water Heater", "TV"];
export const SHARED_FACILITY_OPTIONS = ["Parkir Motor", "Dapur Bersama", "Ruang Tamu", "CCTV", "Laundry", "Dispenser"];
