"use client";

import * as React from "react";
import { Building2, Calendar, Check, X } from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WCard } from "@/components/ui/WCard";
import { WField } from "@/components/ui/WField";
import { WButton } from "@/components/ui/WButton";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useBookings, useCancelBooking, useConfirmBooking } from "@/lib/hooks/useBookings";
import type { Booking, BookingStatus } from "@/lib/types";

type FilterId = "semua" | BookingStatus;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "PENDING", label: "Perlu Ditinjau" },
  { id: "CONFIRMED", label: "Dikonfirmasi" },
  { id: "CANCELLED", label: "Dibatalkan" },
];

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Menunggu Konfirmasi",
  CONFIRMED: "Dikonfirmasi",
  ACTIVE: "Aktif",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_VARIANT: Record<BookingStatus, BadgeProps["variant"]> = {
  PENDING: "warning",
  CONFIRMED: "success",
  ACTIVE: "info",
  COMPLETED: "neutral",
  CANCELLED: "error",
};

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function BookingCard({ booking }: { booking: Booking }): React.JSX.Element {
  const confirmBooking = useConfirmBooking();
  const cancelBooking = useCancelBooking();

  return (
    <WCard pad={18} className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          {/* Full student profile (name/photo) lives in user-service, not
              returned by booking-service — shown as a stable short id until
              that lookup is wired up. */}
          <AvatarFallback>{booking.studentId.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-[15px] font-bold text-text">
            Penyewa #{booking.studentId.slice(0, 8)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-textMid">
            <Calendar className="h-3 w-3 shrink-0" />
            {formatDate(booking.checkIn)} · {booking.durationMonths} bln
          </div>
        </div>
        <span className="font-heading text-[13px] font-bold text-accent">{formatRupiah(booking.totalPrice)}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-textSec">
        <Building2 className="h-3.5 w-3.5 shrink-0" /> Listing #{booking.listingId.slice(0, 8)}
        {booking.roomId ? ` · Kamar #${booking.roomId.slice(0, 8)}` : ""}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={STATUS_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
      </div>

      {booking.status === "PENDING" ? (
        <div className="flex gap-2">
          <WButton
            type="button"
            variant="success"
            size="sm"
            icon={<Check className="h-3.5 w-3.5" />}
            onClick={() => confirmBooking.mutate(booking.id)}
            loading={confirmBooking.isPending}
            className="flex-1"
          >
            Konfirmasi
          </WButton>
          <WButton
            type="button"
            variant="outline"
            size="sm"
            icon={<X className="h-3.5 w-3.5" />}
            onClick={() => cancelBooking.mutate(booking.id)}
            loading={cancelBooking.isPending}
            className="flex-1"
          >
            Batalkan
          </WButton>
        </div>
      ) : booking.status === "CONFIRMED" ? (
        <WButton
          type="button"
          variant="outline"
          size="sm"
          icon={<X className="h-3.5 w-3.5" />}
          onClick={() => cancelBooking.mutate(booking.id)}
          loading={cancelBooking.isPending}
        >
          Batalkan Booking
        </WButton>
      ) : null}
    </WCard>
  );
}

export default function TenantsPage(): React.JSX.Element {
  const [filter, setFilter] = React.useState<FilterId>("semua");
  const [query, setQuery] = React.useState("");
  const { data, isLoading, isError } = useBookings(filter === "semua" ? {} : { status: filter });

  const bookings = data?.items ?? [];
  const visible = bookings.filter((b) => (query ? b.studentId.toLowerCase().includes(query.toLowerCase()) : true));

  return (
    <>
      <WHeader
        trail={["Dashboard", "Manajemen Properti"]}
        title="Daftar Calon Penyewa"
        subtitle="Kelola dan tinjau semua permohonan sewa properti Anda secara real-time."
      />

      <WCard pad={8} className="inline-flex w-fit gap-1">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-5 py-2 text-[13.5px] font-medium transition-colors",
                active ? "bg-accent text-white" : "text-textSec hover:bg-bg",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </WCard>

      <WCard pad={18} className="flex items-end gap-3">
        <WField
          label="Cari Calon Penyewa"
          placeholder="Cari berdasarkan id penyewa..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          containerClassName="flex-1"
        />
      </WCard>

      {isError ? (
        <WCard pad={28} className="text-center text-sm text-error">
          Gagal memuat daftar booking. Coba muat ulang halaman.
        </WCard>
      ) : isLoading ? (
        <WCard pad={28} className="text-center text-sm text-textMid">
          Memuat booking…
        </WCard>
      ) : visible.length === 0 ? (
        <WCard pad={28} className="text-center text-sm text-textMid">
          Belum ada booking untuk filter ini.
        </WCard>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </>
  );
}
