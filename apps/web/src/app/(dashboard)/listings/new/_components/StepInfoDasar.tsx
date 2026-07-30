import { MapPin } from "lucide-react";
import { WField } from "@/components/ui/WField";
import { WSelect } from "@/components/ui/WSelect";
import { WSectionCard } from "@/components/ui/WSectionCard";
import { DEFAULT_COORDS, type KostFormState } from "./types";

export interface StepInfoDasarProps {
  form: KostFormState;
  onChange: (patch: Partial<KostFormState>) => void;
}

export function StepInfoDasar({ form, onChange }: StepInfoDasarProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <WSectionCard title="Nama & Deskripsi Properti">
        <WField
          label="Nama Kost"
          placeholder="cth. Kost Lavender Exclusive"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <WSelect label="Jenis Kost" value={form.type} onChange={(e) => onChange({ type: e.target.value })}>
          <option>Khusus Putri</option>
          <option>Khusus Putra</option>
          <option>Campur</option>
        </WSelect>
        <WField
          label="Deskripsikan kost Anda"
          textarea
          placeholder="Ceritakan keunggulan, lingkungan sekitar, dan jarak ke kampus terdekat..."
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </WSectionCard>

      <WSectionCard title="Lokasi & Alamat">
        <WField
          label="Alamat Lengkap"
          placeholder="Jl. Kerto Leksono No. 12, Lowokwaru"
          value={form.address}
          onChange={(e) => onChange({ address: e.target.value })}
        />
        <div className="flex gap-3">
          <WSelect label="Kota" value={form.city} onChange={(e) => onChange({ city: e.target.value })}>
            <option>Malang</option>
            <option>Surabaya</option>
            <option>Batu</option>
          </WSelect>
          <WSelect label="Kecamatan" value={form.district} onChange={(e) => onChange({ district: e.target.value })}>
            <option>Lowokwaru</option>
            <option>Sukun</option>
            <option>Klojen</option>
            <option>Blimbing</option>
          </WSelect>
        </div>
        {/* Titik Koordinat: a real interactive map picker is a later phase.
            Until then we collect lat/lng manually so the saved coordinates
            reflect what the owner actually intends — no silent hardcoded
            value. Defaults to Malang city center; owners refine as needed. */}
        <div className="flex flex-col gap-2 rounded-[10px] border border-borderLight bg-bg px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-textSec">
            <MapPin className="h-3.5 w-3.5" /> Titik Koordinat Lokasi
          </div>
          <div className="flex gap-3">
            <WField
              label="Latitude"
              inputMode="decimal"
              placeholder={DEFAULT_COORDS.lat}
              value={form.lat}
              onChange={(e) => onChange({ lat: e.target.value.replace(/[^\d.-]/g, "") })}
            />
            <WField
              label="Longitude"
              inputMode="decimal"
              placeholder={DEFAULT_COORDS.lng}
              value={form.lng}
              onChange={(e) => onChange({ lng: e.target.value.replace(/[^\d.-]/g, "") })}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-textLight">
            Peta interaktif belum tersedia — masukkan koordinat manual (default: pusat Kota Malang). Anda bisa
            menyalinnya dari Google Maps.
          </p>
        </div>
      </WSectionCard>
    </div>
  );
}

export default StepInfoDasar;
