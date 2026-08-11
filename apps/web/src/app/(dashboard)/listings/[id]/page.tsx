"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin } from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WCard } from "@/components/ui/WCard";
import { WSectionCard } from "@/components/ui/WSectionCard";
import { buttonVariants } from "@/components/ui/WButton";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useListing } from "@/lib/hooks/useListings";
import { colors } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { Listing, ListingStatus, ListingTipe } from "@/lib/types";

const STATUS_LABEL: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  PENDING_REVIEW: "Menunggu Review",
};

const STATUS_VARIANT: Record<ListingStatus, BadgeProps["variant"]> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  INACTIVE: "neutral",
  PENDING_REVIEW: "warning",
};

const TIPE_LABEL: Record<ListingTipe, string> = {
  PUTRA: "Kost Putra",
  PUTRI: "Kost Putri",
  CAMPUR: "Kost Campur",
};

// Same diagonal hatch the pending-review card uses for a missing cover photo.
const HATCH = `repeating-linear-gradient(135deg, ${colors.border} 0 12px, ${colors.borderLight} 12px 24px)`;

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-borderLight py-2.5 last:border-b-0">
      <span className="shrink-0 text-[12.5px] text-textMid">{label}</span>
      <span className="text-right text-[13px] font-semibold text-text">{value}</span>
    </div>
  );
}

function Gallery({ listing }: { listing: Listing }): React.JSX.Element {
  const [active, setActive] = React.useState(0);
  const photos = listing.photos;

  if (photos.length === 0) {
    return (
      <div
        className="flex h-[320px] items-center justify-center rounded-xl border border-border"
        style={{ background: HATCH }}
      >
        <span className="font-mono text-[11px] text-textLight">[ belum ada foto ]</span>
      </div>
    );
  }

  // `active` can only be set from the thumbnail list below, so it is always a
  // valid index — but read defensively since photos come from the API.
  const cover = photos[active] ?? photos[0];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative h-[320px] overflow-hidden rounded-xl border border-border bg-bg">
        {cover ? (
          <Image src={cover} alt={listing.title} fill className="object-cover" unoptimized />
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div className="flex flex-wrap gap-2.5">
          {photos.map((photo, i) => (
            <button
              key={photo}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Lihat foto ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === active ? "border-accent" : "border-border hover:border-accentBorder",
              )}
            >
              <Image src={photo} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ListingDetailPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { data: listing, isLoading, isError, error } = useListing(params.id);

  const backLink = (
    <Link href="/listings" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
      <ArrowLeft className="h-3.5 w-3.5" /> Kembali
    </Link>
  );

  if (isLoading) {
    return (
      <>
        <WHeader trail={["Dashboard", "Manajemen Properti"]} title="Detail Properti" action={backLink} />
        <WCard pad={28} className="text-center text-sm text-textMid">
          Memuat properti…
        </WCard>
      </>
    );
  }

  if (isError || !listing) {
    // listing-service returns 404 NOT_FOUND for an unknown id; anything else
    // (network, 5xx) surfaces the same way rather than pretending it's missing.
    const message = error instanceof Error ? error.message : "Properti tidak ditemukan.";
    return (
      <>
        <WHeader trail={["Dashboard", "Manajemen Properti"]} title="Detail Properti" action={backLink} />
        <WCard pad={28} className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm text-error">{message}</span>
          <Link href="/listings" className={cn(buttonVariants({ size: "sm" }))}>
            Kembali ke Properti Saya
          </Link>
        </WCard>
      </>
    );
  }

  const facilityEntries = Object.entries(listing.facilities ?? {});

  return (
    <>
      <WHeader
        trail={["Dashboard", "Manajemen Properti", listing.title]}
        title={listing.title}
        subtitle={`${listing.address}, ${listing.kelurahan}, ${listing.kecamatan}, ${listing.city}`}
        action={backLink}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Gallery listing={listing} />

          <WSectionCard title="Deskripsi">
            <p className="whitespace-pre-line text-[13.5px] leading-[1.7] text-textMid">
              {listing.description}
            </p>
          </WSectionCard>

          <WSectionCard title="Fasilitas">
            {listing.amenities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {listing.amenities.map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-border bg-bgAlt px-3 py-1.5 text-[12.5px] text-textSec"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-textMid">Belum ada fasilitas yang dicantumkan.</p>
            )}
          </WSectionCard>

          <WSectionCard title="Aturan Kost">
            {listing.rules.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {listing.rules.map((rule) => (
                  <li key={rule} className="flex gap-2.5 text-[13px] leading-[1.6] text-textMid">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {rule}
                  </li>
                ))}
              </ul>
            ) : (
              // The Tambah Kost wizard doesn't collect rules yet (C5 gap), so
              // this is empty for every listing created through it today.
              <p className="text-[13px] text-textMid">Belum ada aturan yang dicantumkan.</p>
            )}
          </WSectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WCard pad={22}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-textSec">Status</span>
              <Badge variant={STATUS_VARIANT[listing.status]}>{STATUS_LABEL[listing.status]}</Badge>
            </div>
            <div className="font-heading text-[24px] font-bold text-accent">
              {formatRupiah(listing.pricePerMonth)}
              <span className="ml-1 text-[13px] font-normal text-textLight">/ bulan</span>
            </div>
          </WCard>

          <WSectionCard title="Informasi Properti">
            <div className="flex flex-col">
              <InfoRow label="Tipe Kost" value={TIPE_LABEL[listing.tipe]} />
              <InfoRow label="Alamat" value={listing.address} />
              <InfoRow label="Kelurahan" value={listing.kelurahan} />
              <InfoRow label="Kecamatan" value={listing.kecamatan} />
              <InfoRow label="Kota" value={listing.city} />
              <InfoRow
                label="Koordinat"
                value={
                  <span className="inline-flex items-center gap-1 font-mono text-[12px]">
                    <MapPin className="h-3 w-3 text-textMid" />
                    {listing.lat}, {listing.lng}
                  </span>
                }
              />
              <InfoRow label="Dibuat" value={formatDateTime(listing.createdAt)} />
              <InfoRow label="Diperbarui" value={formatDateTime(listing.updatedAt)} />
            </div>
          </WSectionCard>

          {/* Only rendered when the payload actually carries facility data —
              the wizard currently sends `{}`, so for most listings this card
              is correctly absent rather than showing an empty shell. */}
          {facilityEntries.length > 0 ? (
            <WSectionCard title="Detail Fasilitas">
              <div className="flex flex-col">
                {facilityEntries.map(([key, value]) => (
                  <InfoRow key={key} label={key} value={String(value)} />
                ))}
              </div>
            </WSectionCard>
          ) : null}
        </div>
      </div>
    </>
  );
}
