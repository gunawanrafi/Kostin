"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Check,
  FileCheck2,
  GraduationCap,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WCard } from "@/components/ui/WCard";
import { WField } from "@/components/ui/WField";
import { WButton, buttonVariants } from "@/components/ui/WButton";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useBookings, useCancelBooking, useConfirmBooking } from "@/lib/hooks/useBookings";
import type { BookingStatus, BookingWithContext, UserRole } from "@/lib/types";

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

const ROLE_LABEL: Record<UserRole, string> = {
  STUDENT: "Mahasiswa",
  OWNER: "Pemilik Kost",
  ADMIN: "Admin",
  PARENT: "Orang Tua",
};

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// The applicant's academic line, e.g. "Universitas Brawijaya · Teknik
// Informatika · Th. 2". Built from whichever parts exist — a student who never
// filled in a profile gets no line at all rather than "Universitas -".
function academicLine(student: BookingWithContext["student"]): string | null {
  const parts = [
    student.university,
    student.major,
    student.yearOfStudy ? `Th. ${student.yearOfStudy}` : null,
  ].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w.charAt(0).toUpperCase()).join("") || "?";
}

function ApplicantCard({ booking }: { booking: BookingWithContext }): React.JSX.Element {
  const confirmBooking = useConfirmBooking();
  const cancelBooking = useCancelBooking();

  const { student, listing, room } = booking;
  const academic = academicLine(student);
  // Documents were attached to the application. Note this says "submitted",
  // not "verified" — nothing reviews these files (see the badge comment).
  const documentsSubmitted = Boolean(booking.ktmUrl) || Boolean(booking.ktpUrl);

  return (
    <WCard pad={18} className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={student.avatarUrl ?? undefined} alt={student.name} />
          <AvatarFallback>{initials(student.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-[15px] font-bold text-text">{student.name}</div>
          <div className="text-xs text-textMid">{ROLE_LABEL[student.role]}</div>
          {academic ? (
            <div className="mt-1 flex items-start gap-1.5 text-xs text-textSec">
              <GraduationCap className="mt-[1px] h-3 w-3 shrink-0" />
              <span className="min-w-0 break-words">{academic}</span>
            </div>
          ) : null}
        </div>
        <span className="shrink-0 font-heading text-[13px] font-bold text-accent">
          {formatRupiah(booking.totalPrice)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-textSec">
        <div className="flex items-start gap-1.5">
          <Building2 className="mt-[1px] h-3.5 w-3.5 shrink-0" />
          {/* TODO(rooms): room name comes from the joined Room row. Bookings
              made against a listing as a whole have none, and there is still
              no rooms API for the owner to manage them — so the listing title
              is what identifies the application in that case. */}
          <span className="min-w-0 break-words">
            {listing.title}
            {room ? ` · ${room.name}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0" />
          {formatDate(booking.checkIn)} · {booking.durationMonths} bln
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={STATUS_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>

        {/* The design calls this "✓ Identitas Terverifikasi". It is not:
            users.status only records that the phone passed OTP, and no
            service ever reviews a KTM/KTP. Labelling an OTP check as verified
            identity would tell an owner something about an applicant that
            nobody actually checked, so both signals say what they are. */}
        {student.accountVerified ? (
          <Badge variant="success" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Akun Terverifikasi
          </Badge>
        ) : (
          <Badge variant="neutral" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Akun Belum Terverifikasi
          </Badge>
        )}

        {documentsSubmitted ? (
          <Badge variant="info" className="gap-1">
            <FileCheck2 className="h-3 w-3" /> Dokumen Terlampir
          </Badge>
        ) : null}
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

  const bookings = React.useMemo(() => data?.items ?? [], [data]);

  // Searches the things an owner can actually read off a card. The old
  // version matched on studentId, which is a cuid nobody can type.
  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) =>
      [b.student.name, b.student.university, b.student.major, b.listing.title, b.room?.name]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [bookings, query]);

  return (
    <>
      <WHeader
        trail={["Dashboard", "Manajemen Properti"]}
        title="Daftar Calon Penyewa"
        subtitle="Kelola dan tinjau semua permohonan sewa properti Anda secara real-time."
        action={
          <Link
            href="/tenants/criteria"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Kriteria Penyewa
          </Link>
        }
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
          placeholder="Cari nama, kampus, atau properti…"
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
          {bookings.length === 0
            ? "Belum ada booking untuk filter ini."
            : `Tidak ada calon penyewa yang cocok dengan "${query}".`}
        </WCard>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((booking) => (
            <ApplicantCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}

      {/* The design's cards carry a match score and a star rating. Scoring
          needs ai-service (Phase 2) and there is no tenant-rating data at all,
          so neither is rendered — an empty "—" score column would still imply
          a number is coming from somewhere. */}
      <p className="text-[12px] text-textLight">
        Skor kecocokan belum tersedia — menunggu layanan pencocokan AI (fase berikutnya).
      </p>
    </>
  );
}
