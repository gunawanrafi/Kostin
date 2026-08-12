import Image from "next/image";
import { Bookmark, Check, Eye, MapPin, X } from "lucide-react";
import { WSectionCard } from "@/components/ui/WSectionCard";
import { WCard } from "@/components/ui/WCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { HOUSE_RULE_OPTIONS, PAYMENT_DURATION_OPTIONS, type KostFormState } from "./types";
import { parseAdditionalRules } from "./mapForm";

export interface StepPreviewPublishProps {
  form: KostFormState;
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

function rupiah(digits: string): string {
  return `Rp ${digits ? Number(digits).toLocaleString("id-ID") : "0"}`;
}

function SummaryRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-borderLight py-2 last:border-b-0">
      <span className="text-[12.5px] text-textMid">{label}</span>
      <span className="text-right text-[12.5px] font-semibold text-text">{value}</span>
    </div>
  );
}

// Read-only summary of everything step 4 collected. This step used to *be*
// the pricing form; it now shows what will actually be sent, so an owner can
// verify the rules and fees survived before publishing.
export function StepPreviewPublish({ form }: StepPreviewPublishProps): JSX.Element {
  const percent = computeCompleteness(form);
  const durationLabel =
    PAYMENT_DURATION_OPTIONS.find((o) => o.value === form.paymentDuration)?.label ?? "Bulanan";
  const extraRules = parseAdditionalRules(form.additionalRules);

  const fees: { label: string; value: string }[] = [
    { label: "Penghuni Tambahan", value: form.feeExtraOccupant },
    { label: "Parkir Motor", value: form.feeMotorcycleParking },
    { label: "Parkir Mobil", value: form.feeCarParking },
  ]
    .filter((f) => f.value !== "")
    .map((f) => ({ label: f.label, value: `${rupiah(f.value)} / bln` }));

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-5">
        <WSectionCard title="💳 Harga & Pembayaran">
          <div className="flex flex-col">
            <SummaryRow label="Harga Sewa" value={`${rupiah(form.price)} / bulan`} />
            <SummaryRow label="Durasi Pembayaran" value={durationLabel} />
            <SummaryRow
              label="Deposit"
              value={form.depositEnabled ? rupiah(form.deposit) : "Tidak dikenakan"}
            />
          </div>
        </WSectionCard>

        <WSectionCard title="🚪 Aturan Kost">
          <div className="flex flex-col gap-2">
            {HOUSE_RULE_OPTIONS.map(({ key, label }) => {
              const on = form.houseRules[key];
              return (
                <div key={key} className="flex items-center gap-2 text-[12.5px]">
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                      on ? "bg-successSoft text-success" : "bg-bg text-textLight",
                    )}
                  >
                    {on ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <X className="h-2.5 w-2.5" />}
                  </span>
                  <span className={on ? "text-text" : "text-textLight"}>{label}</span>
                </div>
              );
            })}
          </div>

          {extraRules.length > 0 ? (
            <div className="mt-1">
              <div className="mb-1.5 font-heading text-[12.5px] font-bold text-textSec">
                Aturan Tambahan
              </div>
              <ul className="flex list-disc flex-col gap-1 pl-4 text-[12.5px] text-textMid">
                {extraRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </WSectionCard>

        <WSectionCard title="➕ Biaya Tambahan">
          {fees.length > 0 ? (
            <div className="flex flex-col">
              {fees.map((fee) => (
                <SummaryRow key={fee.label} label={fee.label} value={fee.value} />
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-textMid">Tidak ada biaya tambahan.</p>
          )}
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
                    {rupiah(form.price)} / bulan
                  </div>
                </div>
                <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-accentBorder text-accent">
                  <Bookmark className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* The old preview stamped a green "VERIFIED" badge on every listing.
              Nothing verifies a listing — new ones are created as DRAFT and no
              review flow exists — so showing that to the owner was telling
              them something untrue about their own listing. */}
          <p className="mt-3 text-[11px] leading-[1.5] text-textLight">
            Listing disimpan sebagai draf. Publikasi ke pencarian menyusul setelah tinjauan.
          </p>
        </WCard>
      </div>
    </div>
  );
}

export default StepPreviewPublish;
