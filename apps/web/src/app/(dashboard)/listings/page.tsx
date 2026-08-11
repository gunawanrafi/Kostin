"use client";

import Link from "next/link";
import { Building2, Lightbulb, Plus, Search } from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WCard } from "@/components/ui/WCard";
import { WField } from "@/components/ui/WField";
import { WButton, buttonVariants } from "@/components/ui/WButton";
import { WEmptyBlock } from "@/components/ui/WEmptyBlock";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListings } from "@/lib/hooks/useListings";
import { cn } from "@/lib/utils";
import type { ListingStatus } from "@/lib/types";
import { PendingReviewCard } from "./_components/PendingReviewCard";

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

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function ListingsPage(): JSX.Element {
  const { data, isLoading, isError } = useListings({ mine: true });
  const listings = data?.items ?? [];

  // PENDING_REVIEW listings get the dedicated M2 treatment above the table and
  // are held out of the table itself, so a pending listing appears once rather
  // than twice. Every listing is still accounted for on the page.
  const pending = listings.filter((l) => l.status === "PENDING_REVIEW");
  const tableListings = listings.filter((l) => l.status !== "PENDING_REVIEW");

  const isEmpty = !isLoading && !isError && listings.length === 0;
  // The table card also carries the loading and error states, so it renders
  // whenever there is something for it to say.
  const showTable = isError || isLoading || tableListings.length > 0;

  return (
    <>
      <WHeader
        trail={["Dashboard", "Manajemen Properti"]}
        title="Manajemen Properti Saya"
        subtitle="Pantau dan kelola performa unit kost Anda dari satu dashboard."
        action={
          <Link href="/listings/new">
            <WButton icon={<Plus className="h-4 w-4" />}>Tambah Kost Baru</WButton>
          </Link>
        }
      />

      {/* Neither the M1 nor the M2 artboard shows a filter bar — it appears
          only when there's a table to filter, so it never floats above an
          empty state or a pending-only list. */}
      {showTable ? (
        <WCard pad={20} className="flex flex-wrap items-end gap-4">
          <WField
            label="Cari Properti"
            placeholder="Cari nama kost..."
            containerClassName="min-w-[240px] flex-1"
          />
          <WButton type="button" variant="outline" icon={<Search className="h-4 w-4" />}>
            Cari
          </WButton>
        </WCard>
      ) : null}

      {/* ── M2 · Menunggu Verifikasi ─────────────────────────────── */}
      {pending.length > 0 ? (
        <div className="flex flex-col gap-4">
          {pending.map((listing) => (
            <PendingReviewCard key={listing.id} listing={listing} />
          ))}

          <div className="flex items-start gap-2.5 rounded-xl border border-info bg-infoSoft px-[18px] py-4 text-[13px] leading-[1.6] text-info">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            <span>
              Sambil menunggu, lengkapi <b className="font-semibold">Kriteria Penyewa</b> dan
              aktifkan <b className="font-semibold">Smart Rent</b> agar siap begitu listing tayang.
            </span>
          </div>
        </div>
      ) : null}

      {/* ── M1 · Belum ada listing ───────────────────────────────── */}
      {isEmpty ? (
        <WEmptyBlock
          icon={<Building2 className="h-9 w-9" strokeWidth={1.75} />}
          title="Belum ada listing"
          description="Buat listing pertamamu untuk mulai menerima calon penyewa. Prosesnya hanya butuh beberapa menit dengan wizard kami."
          action={
            <Link href="/listings/new" className={cn(buttonVariants())}>
              <Plus className="h-4 w-4" /> Buat Listing Pertama
            </Link>
          }
        />
      ) : null}

      {showTable ? (
        <WCard noPadding>
          {isError ? (
            <div className="px-6 py-10 text-center text-sm text-error">
              Gagal memuat daftar properti. Coba muat ulang halaman.
            </div>
          ) : isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-textMid">Memuat properti…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kost</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Harga / Bulan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableListings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-heading font-semibold text-text">{listing.title}</TableCell>
                    <TableCell className="text-textMid">
                      📍 {listing.kecamatan}, {listing.city}
                    </TableCell>
                    <TableCell className="font-heading font-semibold text-accent">
                      {formatRupiah(listing.pricePerMonth)}
                      <span className="ml-1 text-xs font-normal text-textLight">/ bln</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[listing.status]}>{STATUS_LABEL[listing.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/listings/${listing.id}`}
                        className={cn(buttonVariants({ variant: "dark", size: "sm" }))}
                      >
                        Lihat Detail
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </WCard>
      ) : null}
    </>
  );
}
