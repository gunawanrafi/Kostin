import Image from "next/image";
import { Bookmark, Eye, MapPin } from "lucide-react";
import { WField } from "@/components/ui/WField";
import { WSectionCard } from "@/components/ui/WSectionCard";
import { WCard } from "@/components/ui/WCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { KostFormState } from "./types";

export interface StepPreviewPublishProps {
  form: KostFormState;
  onChange: (patch: Partial<KostFormState>) => void;
}

function computeCompleteness(form: KostFormState): number {
  const checks = [
    Boolean(form.name),
    Boolean(form.description),
    Boolean(form.address),
    form.roomFacilities.length > 0,
    form.sharedFacilities.length > 0,
    Boolean(form.mainPhoto),
    form.roomPhotos.length >= 3,
    Boolean(form.price),
  ];
  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

export function StepPreviewPublish({ form, onChange }: StepPreviewPublishProps): JSX.Element {
  const percent = computeCompleteness(form);

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-5">
        <WSectionCard title="💳 Harga Sewa & Deposit">
          <div className="flex gap-4">
            <WField
              label="Harga Sewa"
              prefix="Rp"
              placeholder="1.500.000"
              value={form.price}
              onChange={(e) => onChange({ price: e.target.value.replace(/[^\d]/g, "") })}
            />
          </div>
          {/* Deposit has no column on the Listing model (or anywhere in the
              Prisma schema) yet, so the toggle/nominal are disabled instead of
              collecting a value that would silently go nowhere. */}
          <label className="flex items-center justify-between gap-4 rounded-lg bg-bg px-3.5 py-3 opacity-60">
            <div>
              <div className="text-[13.5px] font-semibold text-text">Uang Muka / Deposit Keamanan</div>
              <div className="mt-0.5 text-[11.5px] text-warningTextDeep">Belum tersedia — fitur deposit akan hadir di fase berikutnya.</div>
            </div>
            <button
              type="button"
              disabled
              aria-pressed={false}
              className="flex h-[22px] w-10 shrink-0 cursor-not-allowed items-center justify-start rounded-full bg-border p-0.5"
            >
              <span className="h-[18px] w-[18px] rounded-full bg-white shadow" />
            </button>
          </label>
        </WSectionCard>
      </div>

      <div className="flex flex-col gap-5">
        <WCard pad={22}>
          <div className="mb-3.5 flex items-center gap-2">
            <Eye className="h-4 w-4 text-success" />
            <span className="font-heading text-[15px] font-bold text-text">Live Preview Listing</span>
          </div>
          <div className="mb-1.5 flex justify-between text-xs text-textMid">
            <span>Skor Kelengkapan Listing</span>
            <span className="font-bold text-accent">{percent}%</span>
          </div>
          <Progress value={percent} className="mb-4" />

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="relative h-[150px] bg-bg">
              {form.mainPhoto ? (
                <Image src={form.mainPhoto.url} alt={form.mainPhoto.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-center font-mono text-[10px] text-textLight">
                    [ foto ditambahkan di langkah Foto & Media ]
                  </span>
                </div>
              )}
              <Badge variant="success" className="absolute left-2 top-2 rounded">
                VERIFIED
              </Badge>
            </div>
            <div className="p-3.5">
              <div className="font-heading text-[15px] font-bold text-text">
                {form.name || "Nama kost akan tampil di sini"}
              </div>
              <div className="my-1 flex items-center gap-1 text-[11.5px] text-textMid">
                <MapPin className="h-3 w-3" /> {form.district}, {form.city}
              </div>
              <div className="mb-2.5 flex gap-1.5">
                <Badge variant="neutral">{form.type}</Badge>
                {form.roomFacilities.slice(0, 1).map((f) => (
                  <Badge key={f} variant="neutral">
                    {f}
                  </Badge>
                ))}
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] text-textLight">Mulai dari</div>
                  <div className="font-heading text-sm font-bold text-text">
                    Rp {form.price ? Number(form.price).toLocaleString("id-ID") : "0"} / bulan
                  </div>
                </div>
                <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-accentBorder text-accent">
                  <Bookmark className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>
        </WCard>
      </div>
    </div>
  );
}

export default StepPreviewPublish;
