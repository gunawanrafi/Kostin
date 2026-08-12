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
import { StepHargaAturan } from "./_components/StepHargaAturan";
import { StepPreviewPublish } from "./_components/StepPreviewPublish";
import { mapFormToCreateListingInput } from "./_components/mapForm";
import { INITIAL_FORM_STATE, STEP_LABELS, type KostFormState } from "./_components/types";
import { useCreateListing, useUploadListingPhotos } from "@/lib/hooks/useListings";

// Ordered list of the actual File objects the owner selected, main photo
// first. Empty when nothing was uploaded in the Foto & Media step.
function collectPhotoFiles(form: KostFormState): File[] {
  const files: File[] = [];
  if (form.mainPhoto) files.push(form.mainPhoto.file);
  for (const photo of form.roomPhotos) files.push(photo.file);
  return files;
}

function toMessage(err: unknown, fallback: string): string {
  const message = axios.isAxiosError<{ error?: { message?: string } }>(err)
    ? err.response?.data?.error?.message
    : err instanceof Error
      ? err.message
      : undefined;
  return message ?? fallback;
}

const NEXT_LABELS = [
  "Lanjutkan ke Fasilitas & Kamar →",
  "Lanjutkan ke Foto & Media →",
  "Lanjutkan ke Harga & Aturan →",
  "Lanjutkan ke Preview & Publish →",
  "Simpan & Publish Listing 🚀",
];

const HARGA_ATURAN_STEP = 3;

export default function TambahKostPage(): JSX.Element {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<KostFormState>(INITIAL_FORM_STATE);
  const [error, setError] = React.useState<string | undefined>();
  // When the listing is created but its photos fail to upload, we keep the new
  // listing id so the owner can retry the upload without recreating the listing.
  const [photoError, setPhotoError] = React.useState<string | undefined>();
  const [createdId, setCreatedId] = React.useState<string | undefined>();
  const [uploadPercent, setUploadPercent] = React.useState(0);
  const createListing = useCreateListing();
  const uploadPhotos = useUploadListingPhotos();

  const busy = createListing.isPending || uploadPhotos.isPending;

  const handleChange = (patch: Partial<KostFormState>): void => setForm((prev) => ({ ...prev, ...patch }));

  const handleBack = (): void => {
    if (step === 0) {
      router.push("/listings");
    } else {
      setStep((s) => s - 1);
    }
  };

  // Uploads the selected photos to an already-created listing, then navigates
  // to the listings page. Photo failures are surfaced separately (the listing
  // itself already exists) so the owner is never misled into thinking the
  // photos saved when they didn't.
  const uploadPhotosThenFinish = async (listingId: string): Promise<void> => {
    const files = collectPhotoFiles(form);
    if (files.length === 0) {
      router.push("/listings");
      return;
    }
    setPhotoError(undefined);
    setUploadPercent(0);
    try {
      await uploadPhotos.mutateAsync({ id: listingId, files, onProgress: setUploadPercent });
      router.push("/listings");
    } catch (err) {
      setPhotoError(toMessage(err, "Foto gagal diunggah."));
    }
  };

  // The one client-side gate: an enabled deposit with no nominal is rejected
  // by listing-service (depositSchema), so catching it here keeps the owner on
  // the step that owns the field instead of bouncing them back from publish.
  const depositIncomplete = form.depositEnabled && !form.deposit;

  const handleNext = async (): Promise<void> => {
    if (step === HARGA_ATURAN_STEP && depositIncomplete) {
      setError("Isi nominal deposit, atau matikan opsi deposit.");
      return;
    }
    if (step < STEP_LABELS.length - 1) {
      setError(undefined);
      setStep((s) => s + 1);
      return;
    }
    // Retry path: the listing already exists, only the photo upload failed.
    if (createdId) {
      await uploadPhotosThenFinish(createdId);
      return;
    }
    setError(undefined);
    try {
      const listing = await createListing.mutateAsync(mapFormToCreateListingInput(form));
      setCreatedId(listing.id);
      await uploadPhotosThenFinish(listing.id);
    } catch (err) {
      setError(toMessage(err, "Gagal menyimpan listing. Coba lagi."));
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
      {step === 3 ? <StepHargaAturan form={form} onChange={handleChange} /> : null}
      {step === 4 ? <StepPreviewPublish form={form} /> : null}

      {error ? (
        <div className="rounded-lg border border-error bg-errorSoft px-4 py-3 text-[13px] text-error">{error}</div>
      ) : null}

      {uploadPhotos.isPending ? (
        <div className="rounded-lg border border-accentBorder bg-accentSoft px-4 py-3">
          <div className="mb-1.5 flex justify-between text-[12.5px] font-semibold text-accent">
            <span>Mengunggah foto…</span>
            <span>{uploadPercent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${uploadPercent}%` }} />
          </div>
        </div>
      ) : null}

      {photoError ? (
        <div className="rounded-lg border border-warningBorder bg-warningSoft px-4 py-3 text-[13px] text-warningTextDeep">
          <div className="font-semibold">Listing berhasil dibuat, tetapi foto gagal diunggah.</div>
          <div className="mt-0.5 text-[12px]">{photoError}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <WButton type="button" size="sm" onClick={() => void handleNext()} loading={busy}>
              Coba Unggah Ulang Foto
            </WButton>
            <WButton type="button" size="sm" variant="outline" onClick={() => router.push("/listings")}>
              Lanjut ke Properti Saya
            </WButton>
          </div>
        </div>
      ) : null}

      <div className="flex justify-between pt-1">
        <WButton type="button" variant="outline" onClick={handleBack} disabled={busy}>
          ← Kembali
        </WButton>
        {photoError ? null : (
          <WButton type="button" onClick={handleNext} loading={busy}>
            {NEXT_LABELS[step]}
          </WButton>
        )}
      </div>
    </>
  );
}
