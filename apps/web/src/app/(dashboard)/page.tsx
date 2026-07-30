"use client";

import { Building2, Home, Users, Wallet } from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WKpiCard } from "@/components/ui/WKpiCard";
import { WCard } from "@/components/ui/WCard";
import { useListings } from "@/lib/hooks/useListings";
import { useCurrentUser } from "@/lib/hooks/useAuth";

export default function DashboardHomePage(): JSX.Element {
  const { data, isLoading } = useListings({ mine: true });
  const totalListing = data?.total ?? data?.items.length;
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const greetingName = isUserLoading ? "…" : (currentUser?.name ?? "Pemilik");

  return (
    <>
      <WHeader
        trail={["Dashboard"]}
        title="Dashboard Pemilik"
        subtitle={`Selamat pagi, ${greetingName}. Berikut adalah ringkasan properti Anda hari ini.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WKpiCard
          label="Total Listing"
          value={isLoading ? "…" : `${totalListing ?? 0} Kost`}
          icon={<Building2 className="h-3.5 w-3.5" />}
          tone="accent"
        />
        {/* Okupansi depends on room/booking occupancy data — booking-service
            doesn't expose a per-room occupancy metric yet. Phase 2. */}
        <WKpiCard label="Okupansi" value="—" icon={<Home className="h-3.5 w-3.5" />} tone="info" sub="Belum ada data" />
        {/* Pendapatan Bulan Ini depends on payment-service, which doesn't
            exist yet (Phase 0 — see CLAUDE.md service table). Phase 2. */}
        <WKpiCard
          label="Pendapatan Bulan Ini"
          value="—"
          icon={<Wallet className="h-3.5 w-3.5" />}
          tone="success"
          sub="Belum ada data"
        />
        {/* Penyewa Aktif depends on aggregating active bookings, which
            booking-service doesn't expose as a count endpoint yet. Phase 2. */}
        <WKpiCard label="Penyewa Aktif" value="—" icon={<Users className="h-3.5 w-3.5" />} tone="accent" sub="Belum ada data" />
      </div>

      <WCard pad={28}>
        <div className="mb-5 font-heading text-lg font-semibold text-text">Aktivitas & Tugas Urgent</div>
        {/* No activity/task feed data source exists yet (would need
            booking, payment, and KYC review events). Phase 2. */}
        <div className="py-6 text-center text-sm text-textMid">Belum ada aktivitas atau tugas.</div>
      </WCard>
    </>
  );
}
