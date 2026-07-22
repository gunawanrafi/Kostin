"use client";

import { Building2, Home, Users, Wallet } from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WKpiCard } from "@/components/ui/WKpiCard";
import { WCard } from "@/components/ui/WCard";
import { cn } from "@/lib/utils";
import { useListings } from "@/lib/hooks/useListings";
import { useCurrentUser } from "@/lib/hooks/useAuth";

interface ActivityItem {
  dotClassName: string;
  title: string;
  subtitle: string;
  action: string;
}

const ACTIVITY: ActivityItem[] = [
  {
    dotClassName: "bg-accent",
    title: "3 pengajuan calon penyewa baru",
    subtitle: "Menunggu review Anda",
    action: "Review",
  },
  {
    dotClassName: "bg-warning",
    title: "2 tagihan sewa jatuh tempo",
    subtitle: "A-04 & B-02 · total Rp 2.400.000",
    action: "Tagih",
  },
  {
    dotClassName: "bg-info",
    title: "Dokumen KYC menunggu verifikasi",
    subtitle: "Estimasi 1×24 jam",
    action: "Lihat",
  },
  {
    dotClassName: "bg-success",
    title: "Penarikan saldo Rp 5.200.000 disetujui",
    subtitle: "Dana cair ke BCA •••• 4821",
    action: "Detail",
  },
];

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
        <WKpiCard
          label="Okupansi"
          value="87%"
          icon={<Home className="h-3.5 w-3.5" />}
          tone="info"
          delta="+4% dari bulan lalu"
          deltaUp
          sub="142 / 163 kamar terisi"
        />
        <WKpiCard
          label="Pendapatan Bulan Ini"
          value="Rp 24.500.000"
          valueClassName="text-success"
          icon={<Wallet className="h-3.5 w-3.5" />}
          tone="success"
          delta="+12% dari bulan lalu"
          deltaUp
        />
        <WKpiCard
          label="Penyewa Aktif"
          value="142 Orang"
          icon={<Users className="h-3.5 w-3.5" />}
          tone="accent"
          sub="8 kontrak berakhir bulan ini"
        />
      </div>

      <WCard pad={28}>
        <div className="mb-5 font-heading text-lg font-semibold text-text">Aktivitas & Tugas Urgent</div>
        <div className="flex flex-col gap-4">
          {ACTIVITY.map((item, i) => (
            <div
              key={item.title}
              className={cn(
                "flex items-start gap-3 pb-4",
                i < ACTIVITY.length - 1 && "border-b border-borderLight",
              )}
            >
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.dotClassName)} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-text">{item.title}</div>
                <div className="mt-0.5 text-[11.5px] text-textMid">{item.subtitle}</div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-accent">{item.action}</span>
            </div>
          ))}
        </div>
      </WCard>
    </>
  );
}
