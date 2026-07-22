import { MapPin } from "lucide-react";
import { WField } from "@/components/ui/WField";
import { WSelect } from "@/components/ui/WSelect";
import { WSectionCard } from "@/components/ui/WSectionCard";
import type { KostFormState } from "./types";

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
        <div className="relative flex h-[150px] items-center justify-center overflow-hidden rounded-[10px] bg-mapBg">
          <MapPin className="h-6 w-6 text-textMid" />
          <span className="absolute left-3 top-2.5 font-mono text-[10px] text-black/35">
            [ Peta Interaktif — {form.city} ]
          </span>
        </div>
      </WSectionCard>
    </div>
  );
}

export default StepInfoDasar;
