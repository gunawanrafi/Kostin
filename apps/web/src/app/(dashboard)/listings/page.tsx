"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WCard } from "@/components/ui/WCard";
import { WField } from "@/components/ui/WField";
import { WButton } from "@/components/ui/WButton";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListings } from "@/lib/hooks/useListings";
import type { ListingStatus } from "@/lib/types";

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

      <WCard noPadding>
        {isError ? (
          <div className="px-6 py-10 text-center text-sm text-error">
            Gagal memuat daftar properti. Coba muat ulang halaman.
          </div>
        ) : isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-textMid">Memuat properti…</div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="text-sm text-textMid">Anda belum memiliki listing kost.</span>
            <Link href="/listings/new">
              <WButton size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
                Tambah Kost Baru
              </WButton>
            </Link>
          </div>
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
              {listings.map((listing) => (
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
                    <WButton type="button" variant="dark" size="sm">
                      Lihat Detail
                    </WButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </WCard>
    </>
  );
}
