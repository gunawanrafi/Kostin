export interface WizardPhoto {
  id: string;
  url: string;
  name: string;
}

export interface KostFormState {
  name: string;
  type: string;
  description: string;
  address: string;
  city: string;
  district: string;
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
  roomFacilities: [],
  sharedFacilities: [],
  unitCount: "",
  capacity: "1",
  mainPhoto: null,
  roomPhotos: [],
  price: "",
  depositEnabled: true,
  deposit: "",
};

export const STEP_LABELS = ["Info Dasar", "Fasilitas", "Foto & Media", "Preview & Publish"];

export const ROOM_FACILITY_OPTIONS = ["AC", "Wi-Fi", "Kasur & Lemari", "Meja Belajar", "Water Heater", "TV"];
export const SHARED_FACILITY_OPTIONS = ["Parkir Motor", "Dapur Bersama", "Ruang Tamu", "CCTV", "Laundry", "Dispenser"];
