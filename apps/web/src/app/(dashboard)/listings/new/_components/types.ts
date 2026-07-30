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
  price: string;
  depositEnabled: boolean;
  deposit: string;
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
};

export const STEP_LABELS = ["Info Dasar", "Fasilitas", "Foto & Media", "Preview & Publish"];

export const ROOM_FACILITY_OPTIONS = ["AC", "Wi-Fi", "Kasur & Lemari", "Meja Belajar", "Water Heater", "TV"];
export const SHARED_FACILITY_OPTIONS = ["Parkir Motor", "Dapur Bersama", "Ruang Tamu", "CCTV", "Laundry", "Dispenser"];
