import { Check } from "lucide-react";
import { WField } from "@/components/ui/WField";
import { WSectionCard } from "@/components/ui/WSectionCard";
import { cn } from "@/lib/utils";
import { ROOM_FACILITY_OPTIONS, SHARED_FACILITY_OPTIONS, type KostFormState } from "./types";

export interface StepFasilitasProps {
  form: KostFormState;
  onChange: (patch: Partial<KostFormState>) => void;
}

function FacilityCheckbox({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <button type="button" onClick={onToggle} className="flex items-center gap-2 text-left">
      <span
        className={cn(
          "flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded border-[1.5px]",
          checked ? "border-accent bg-accent" : "border-border bg-white",
        )}
      >
        {checked ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /> : null}
      </span>
      <span className="text-[13px] text-text">{label}</span>
    </button>
  );
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function StepFasilitas({ form, onChange }: StepFasilitasProps): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <WSectionCard title="Tipe & Kapasitas Kamar">
        {/* Jumlah Unit & Kapasitas belong to per-room data (a Room model with
            maxOccupants / room count). The create-listing flow has no
            room-creation step or backend field for these yet, so they are
            disabled rather than collected and silently dropped. */}
        <div className="mb-1 rounded-lg border border-warningBorder bg-warningSoft px-3 py-2 text-[11.5px] leading-relaxed text-warningTextDeep">
          Pengelolaan unit &amp; kapasitas per kamar belum tersedia — akan hadir bersama fitur manajemen kamar.
        </div>
        <div className="flex gap-4">
          <WField
            label="Jumlah Unit"
            placeholder="3"
            value=""
            disabled
            note="Belum tersedia"
            className="cursor-not-allowed opacity-60"
          />
          <WField
            label="Kapasitas (orang/kamar)"
            placeholder="1"
            value=""
            disabled
            note="Belum tersedia"
            className="cursor-not-allowed opacity-60"
          />
        </div>
      </WSectionCard>

      <WSectionCard title="Fasilitas Kamar">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
          {ROOM_FACILITY_OPTIONS.map((facility) => (
            <FacilityCheckbox
              key={facility}
              label={facility}
              checked={form.roomFacilities.includes(facility)}
              onToggle={() => onChange({ roomFacilities: toggleValue(form.roomFacilities, facility) })}
            />
          ))}
        </div>
      </WSectionCard>

      <WSectionCard title="Fasilitas Bersama">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
          {SHARED_FACILITY_OPTIONS.map((facility) => (
            <FacilityCheckbox
              key={facility}
              label={facility}
              checked={form.sharedFacilities.includes(facility)}
              onToggle={() => onChange({ sharedFacilities: toggleValue(form.sharedFacilities, facility) })}
            />
          ))}
        </div>
      </WSectionCard>
    </div>
  );
}

export default StepFasilitas;
