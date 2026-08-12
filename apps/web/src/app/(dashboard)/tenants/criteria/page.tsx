"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Info, Plus, X } from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WButton, buttonVariants } from "@/components/ui/WButton";
import { WCard } from "@/components/ui/WCard";
import { WField } from "@/components/ui/WField";
import { WSectionCard } from "@/components/ui/WSectionCard";
import { WSelect } from "@/components/ui/WSelect";
import { cn } from "@/lib/utils";
import { useSaveScreeningCriteria, useScreeningCriteria } from "@/lib/hooks/useScreeningCriteria";
import type { ScreeningCriteria } from "@/lib/types";

const MAX_UNIVERSITIES = 20;
const MAX_NOTES = 500;

const DURATION_PRESETS = [1, 3, 6, 12, 24];

// The API accepts any integer 1–24, so a stored value need not be one of the
// presets. Folding it in keeps the <select> from rendering blank on a value it
// would otherwise silently drop — and from overwriting it on the next save.
function durationOptions(current: number): number[] {
  return DURATION_PRESETS.includes(current)
    ? DURATION_PRESETS
    : [...DURATION_PRESETS, current].sort((a, b) => a - b);
}

// Each toggle names the applicant field it is actually checked against, so an
// owner can tell what the platform can and cannot see about a candidate.
const TOGGLES: {
  key: keyof Pick<
    ScreeningCriteria,
    "requireVerifiedAccount" | "requireKtm" | "requireKtp" | "allowSmoking" | "allowPets"
  >;
  label: string;
  hint: string;
}[] = [
  {
    key: "requireVerifiedAccount",
    label: "Wajib akun terverifikasi",
    hint: "Nomor WhatsApp calon penyewa sudah lolos verifikasi OTP.",
  },
  {
    key: "requireKtm",
    label: "Wajib melampirkan KTM",
    hint: "Kartu Tanda Mahasiswa diunggah saat mengajukan sewa.",
  },
  {
    key: "requireKtp",
    label: "Wajib melampirkan KTP",
    hint: "Kartu Tanda Penduduk diunggah saat mengajukan sewa.",
  },
  {
    key: "allowSmoking",
    label: "Menerima perokok",
    hint: "Dicocokkan dengan gaya hidup pada profil calon penyewa.",
  },
  {
    key: "allowPets",
    label: "Menerima hewan peliharaan",
    hint: "Dicocokkan dengan gaya hidup pada profil calon penyewa.",
  },
];

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border bg-bg px-4 py-3 transition-colors",
        disabled ? "cursor-not-allowed opacity-60" : "hover:border-accentBorder",
      )}
    >
      <span className="min-w-0">
        <span className="block font-heading text-[13px] font-bold text-textSec">{label}</span>
        <span className="mt-0.5 block text-[11.5px] leading-[1.5] text-textLight">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-accent"
      />
    </label>
  );
}

function UniversityList({
  values,
  onChange,
  disabled,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const [draft, setDraft] = React.useState("");

  const trimmed = draft.trim();
  const isDuplicate = values.some((v) => v.toLowerCase() === trimmed.toLowerCase());
  const canAdd = trimmed.length > 0 && !isDuplicate && values.length < MAX_UNIVERSITIES;

  const add = (): void => {
    if (!canAdd) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <WField
          label="Kampus yang Diutamakan"
          placeholder="mis. Universitas Brawijaya"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled || values.length >= MAX_UNIVERSITIES}
          // Enter inside a form would submit it; this adds to the list instead.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          error={trimmed && isDuplicate ? "Kampus ini sudah ada di daftar" : undefined}
          note={
            values.length >= MAX_UNIVERSITIES
              ? `Maksimal ${MAX_UNIVERSITIES} kampus.`
              : "Opsional. Kosongkan jika menerima dari kampus mana pun."
          }
          containerClassName="flex-1"
        />
        <WButton
          type="button"
          variant="outline"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={add}
          disabled={!canAdd || disabled}
          className="mb-[26px] shrink-0"
        >
          Tambah
        </WButton>
      </div>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((university) => (
            <span
              key={university}
              className="inline-flex items-center gap-1.5 rounded-full bg-accentSoft px-3 py-1.5 text-[12.5px] font-semibold text-accent"
            >
              {university}
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== university))}
                disabled={disabled}
                aria-label={`Hapus ${university}`}
                className="rounded-full transition-opacity hover:opacity-70 disabled:opacity-40"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ScreeningCriteriaPage(): React.JSX.Element {
  const { data: saved, isLoading, isError, error } = useScreeningCriteria();
  const save = useSaveScreeningCriteria();

  // null means "untouched — mirror the server", the same pattern the settings
  // page uses, so the form seeds itself without an effect and re-syncs after
  // a save instead of holding a stale copy.
  const [draft, setDraft] = React.useState<ScreeningCriteria | null>(null);
  const criteria = draft ?? saved ?? null;

  const patch = (fields: Partial<ScreeningCriteria>): void => {
    if (!criteria) return;
    setDraft({ ...criteria, ...fields });
  };

  const isDirty =
    criteria !== null && saved !== undefined && JSON.stringify(criteria) !== JSON.stringify(saved);

  const submit = (): void => {
    if (!criteria) return;
    // Reset to the server copy so the form un-dirties and shows exactly what
    // was stored.
    save.mutate(criteria, { onSuccess: () => setDraft(null) });
  };

  // A STUDENT reaching this route gets 403 from user-service. Saying so is
  // better than an empty form that would fail on every save.
  const isForbidden = isError && error.code === "FORBIDDEN";

  return (
    <>
      <WHeader
        trail={["Dashboard", "Calon Penyewa", "Kriteria Penyewa"]}
        title="Kriteria Penyewa"
        subtitle="Tetapkan standar calon penyewa yang Anda cari. Kriteria ini tampil saat Anda meninjau pengajuan sewa."
        action={
          <Link href="/tenants" className={cn(buttonVariants({ variant: "outline" }))}>
            Kembali ke Daftar
          </Link>
        }
      />

      {/* Stated up front, not buried: nothing auto-rejects on these yet, and
          an owner who assumed otherwise would stop reading applications. */}
      <div className="flex items-start gap-2.5 rounded-lg border border-infoSoft bg-infoSoft px-4 py-3 text-[12.5px] leading-[1.6] text-info">
        <Info className="mt-[2px] h-4 w-4 shrink-0" />
        <span>
          Kriteria ini bersifat panduan: setiap pengajuan tetap Anda tinjau dan setujui sendiri.
          Penolakan otomatis berdasarkan kriteria belum aktif.
        </span>
      </div>

      {isForbidden ? (
        <WCard pad={28} className="text-center text-sm text-error">
          Halaman ini hanya untuk akun pemilik kost.
        </WCard>
      ) : isError ? (
        <WCard pad={28} className="text-center text-sm text-error">
          {error.message}
        </WCard>
      ) : isLoading || !criteria ? (
        <WCard pad={28} className="text-center text-sm text-textMid">
          Memuat kriteria…
        </WCard>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-7"
        >
          <WSectionCard title="Durasi Sewa">
            <WSelect
              label="Durasi Sewa Minimum"
              value={String(criteria.minDurationMonths)}
              onChange={(e) => patch({ minDurationMonths: Number(e.target.value) })}
              disabled={save.isPending}
            >
              {durationOptions(criteria.minDurationMonths).map((months) => (
                <option key={months} value={months}>
                  {months} bulan
                </option>
              ))}
            </WSelect>
            <p className="text-[11px] text-textLight">
              Pengajuan dengan durasi lebih pendek tetap masuk ke daftar Anda — kriteria ini tidak
              menyaring apa pun secara otomatis.
            </p>
          </WSectionCard>

          <WSectionCard title="Verifikasi & Dokumen">
            <div className="flex flex-col gap-2.5">
              {TOGGLES.map(({ key, label, hint }) => (
                <ToggleRow
                  key={key}
                  label={label}
                  hint={hint}
                  checked={criteria[key]}
                  onChange={(next) => patch({ [key]: next } as Partial<ScreeningCriteria>)}
                  disabled={save.isPending}
                />
              ))}
            </div>
          </WSectionCard>

          <WSectionCard title="Preferensi Kampus">
            <UniversityList
              values={criteria.preferredUniversities}
              onChange={(preferredUniversities) => patch({ preferredUniversities })}
              disabled={save.isPending}
            />
          </WSectionCard>

          <WSectionCard title="Catatan Tambahan">
            <WField
              textarea
              label="Catatan untuk Diri Sendiri"
              placeholder="mis. Diutamakan mahasiswa tingkat akhir yang tidak sering menerima tamu."
              value={criteria.notes}
              onChange={(e) => patch({ notes: e.target.value.slice(0, MAX_NOTES) })}
              disabled={save.isPending}
              note={`${criteria.notes.length}/${MAX_NOTES} karakter. Hanya Anda yang melihat catatan ini.`}
            />
          </WSectionCard>

          {save.isError ? (
            <div className="rounded-lg border border-error bg-errorSoft px-3.5 py-2.5 text-[12.5px] text-error">
              {save.error.message}
            </div>
          ) : null}
          {save.isSuccess && !isDirty ? (
            <div className="flex items-center gap-2 rounded-lg border border-success bg-successSoft px-3.5 py-2.5 text-[12.5px] text-success">
              <Check className="h-3.5 w-3.5" /> Kriteria tersimpan.
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <WButton
              type="button"
              variant="ghost"
              onClick={() => setDraft(null)}
              disabled={!isDirty || save.isPending}
            >
              Batalkan Perubahan
            </WButton>
            <WButton type="submit" loading={save.isPending} disabled={!isDirty}>
              Simpan Kriteria
            </WButton>
          </div>
        </form>
      )}
    </>
  );
}
