"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { WCard } from "@/components/ui/WCard";
import { WButton } from "@/components/ui/WButton";
import { WizardSteps } from "./_components/WizardSteps";
import { StepInfoDasar } from "./_components/StepInfoDasar";
import { StepFasilitas } from "./_components/StepFasilitas";
import { StepFotoMedia } from "./_components/StepFotoMedia";
import { StepPreviewPublish } from "./_components/StepPreviewPublish";
import { INITIAL_FORM_STATE, STEP_LABELS, type KostFormState } from "./_components/types";
import { useCreateListing } from "@/lib/hooks/useListings";
import type { ListingTipe } from "@/lib/types";

const TYPE_LABEL_TO_TIPE: Record<string, ListingTipe> = {
  "Khusus Putri": "PUTRI",
  "Khusus Putra": "PUTRA",
  Campur: "CAMPUR",
};

// Malang city-center fallback — the wizard's "Peta Interaktif" box is a
// placeholder, not a real map picker yet, so there's no lat/lng input to
// read from the form.
const FALLBACK_COORDS = { lat: -7.9666, lng: 112.6326 };

function mapFormToCreateListingInput(form: KostFormState) {
  return {
    title: form.name,
    description: form.description,
    address: form.address,
    // The wizard only collects one "district" field (labeled Kecamatan) —
    // reused for kelurahan too since there's no separate input for it.
    kelurahan: form.district,
    kecamatan: form.district,
    city: form.city,
    lat: FALLBACK_COORDS.lat,
    lng: FALLBACK_COORDS.lng,
    type: TYPE_LABEL_TO_TIPE[form.type] ?? "CAMPUR",
    pricePerMonth: Number(form.price) || 0,
    amenities: [...form.roomFacilities, ...form.sharedFacilities],
  };
}

const NEXT_LABELS = [
  "Lanjutkan ke Fasilitas & Kamar →",
  "Lanjutkan ke Foto & Media →",
  "Lanjutkan ke Preview & Publish →",
  "Simpan & Publish Listing 🚀",
];

export default function TambahKostPage(): JSX.Element {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<KostFormState>(INITIAL_FORM_STATE);
  const [error, setError] = React.useState<string | undefined>();
  const createListing = useCreateListing();

  const handleChange = (patch: Partial<KostFormState>): void => setForm((prev) => ({ ...prev, ...patch }));

  const handleBack = (): void => {
    if (step === 0) {
      router.push("/listings");
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleNext = async (): Promise<void> => {
    if (step < STEP_LABELS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setError(undefined);
    try {
      await createListing.mutateAsync(mapFormToCreateListingInput(form));
      router.push("/listings");
    } catch (err) {
      const message = axios.isAxiosError<{ error?: { message?: string } }>(err)
        ? err.response?.data?.error?.message
        : err instanceof Error
          ? err.message
          : undefined;
      setError(message ?? "Gagal menyimpan listing. Coba lagi.");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-textMid">
          <span>Dashboard</span>
          <span>›</span>
          <span>Manajemen Properti</span>
          <span>›</span>
          <span className="font-semibold text-accent">Tambah Kost Baru</span>
        </div>
        <h1 className="font-heading text-[28px] font-bold text-text">Tambah Kost Baru</h1>
        <p className="text-[13.5px] text-textMid">Pantau dan kelola performa unit kost Anda dari satu dashboard.</p>
      </div>

      <WCard pad={24}>
        <WizardSteps current={step} />
      </WCard>

      {step === 0 ? <StepInfoDasar form={form} onChange={handleChange} /> : null}
      {step === 1 ? <StepFasilitas form={form} onChange={handleChange} /> : null}
      {step === 2 ? <StepFotoMedia form={form} onChange={handleChange} /> : null}
      {step === 3 ? <StepPreviewPublish form={form} onChange={handleChange} /> : null}

      {error ? (
        <div className="rounded-lg border border-error bg-errorSoft px-4 py-3 text-[13px] text-error">{error}</div>
      ) : null}

      <div className="flex justify-between pt-1">
        <WButton type="button" variant="outline" onClick={handleBack}>
          ← Kembali
        </WButton>
        <WButton type="button" onClick={handleNext} loading={createListing.isPending}>
          {NEXT_LABELS[step]}
        </WButton>
      </div>
    </>
  );
}
