"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Upload, X } from "lucide-react";
import { WSectionCard } from "@/components/ui/WSectionCard";
import { cn } from "@/lib/utils";
import type { KostFormState, WizardPhoto } from "./types";

export interface StepFotoMediaProps {
  form: KostFormState;
  onChange: (patch: Partial<KostFormState>) => void;
}

function filesToPhotos(files: FileList | File[]): WizardPhoto[] {
  return Array.from(files)
    .filter((f) => f.type.startsWith("image/"))
    .map((f) => ({ id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`, url: URL.createObjectURL(f), name: f.name }));
}

// Drag & drop upload zone for the single "foto utama" slot. Accepts both
// native drag-and-drop and a click-to-browse file input.
function MainPhotoDropzone({
  photo,
  onDrop,
  onClear,
}: {
  photo: WizardPhoto | null;
  onDrop: (photos: WizardPhoto[]) => void;
  onClear: () => void;
}): JSX.Element {
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null): void => {
    if (!files || files.length === 0) return;
    onDrop(filesToPhotos(files).slice(0, 1));
  };

  if (photo) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border">
        <div className="relative h-[200px] w-full">
          <Image src={photo.url} alt={photo.name} fill className="object-cover" unoptimized />
        </div>
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
          aria-label="Hapus foto"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 text-center transition-colors",
        dragActive ? "border-accent bg-accentSoft" : "border-accentBorder bg-bg",
      )}
    >
      <Upload className="h-6 w-6 text-accent" />
      <span className="text-[13px] font-semibold text-text">Tarik & lepas foto di sini</span>
      <span className="text-xs text-textMid">atau pilih dari komputer · JPG/PNG maks 10MB</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

// Multi-photo grid dropzone for "foto kamar" — each filled slot shows a
// thumbnail with a remove button; the last empty slot is the drop target.
function RoomPhotosDropzone({
  photos,
  onAdd,
  onRemove,
}: {
  photos: WizardPhoto[];
  onAdd: (photos: WizardPhoto[]) => void;
  onRemove: (id: string) => void;
}): JSX.Element {
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null): void => {
    if (!files || files.length === 0) return;
    onAdd(filesToPhotos(files));
  };

  return (
    <div className="grid grid-cols-3 gap-3.5">
      {photos.map((photo) => (
        <div key={photo.id} className="relative h-[130px] overflow-hidden rounded-[10px] border border-border">
          <Image src={photo.url} alt={photo.name} fill className="object-cover" unoptimized />
          <button
            type="button"
            onClick={() => onRemove(photo.id)}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
            aria-label="Hapus foto"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex h-[130px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border-2 border-dashed transition-colors",
          dragActive ? "border-accent bg-accentSoft" : "border-border bg-bg",
        )}
      >
        <ImagePlus className="h-5 w-5 text-textMid" />
        <span className="text-[11px] font-semibold text-textMid">Tambah Foto</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}

export function StepFotoMedia({ form, onChange }: StepFotoMediaProps): JSX.Element {
  return (
    <div className="flex flex-col gap-5">
      <WSectionCard title="🏠 Foto Utama / Depan  *Wajib">
        <p className="-mt-2 text-xs text-textMid">Tampilkan fasad bangunan yang jelas</p>
        <MainPhotoDropzone
          photo={form.mainPhoto}
          onDrop={(photos) => onChange({ mainPhoto: photos[0] ?? null })}
          onClear={() => onChange({ mainPhoto: null })}
        />
      </WSectionCard>

      <WSectionCard title="🛏 Foto Kamar">
        <p className="-mt-2 text-xs text-textMid">Minimal 3 foto (kamar tidur, sudut ruangan, jendela)</p>
        <RoomPhotosDropzone
          photos={form.roomPhotos}
          onAdd={(photos) => onChange({ roomPhotos: [...form.roomPhotos, ...photos] })}
          onRemove={(id) => onChange({ roomPhotos: form.roomPhotos.filter((p) => p.id !== id) })}
        />
      </WSectionCard>
    </div>
  );
}

export default StepFotoMedia;
