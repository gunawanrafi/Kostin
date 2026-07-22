import { Building2, Shield, TrendingUp } from "lucide-react";
import { KostinLogo } from "@/components/brand/KostinLogo";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  { icon: Building2, label: "Manajemen properti & listing" },
  { icon: TrendingUp, label: "Smart Rent: tagihan otomatis" },
  { icon: Shield, label: "Screening penyewa terverifikasi" },
];

// Split-screen shell shared by /login and /register — mirrors the source
// prototype's WOwnerAuthShell: dark brand panel (left, 360px) + centered
// form area (right).
export default function AuthLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen bg-surface font-body">
      <div className="relative hidden w-[360px] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-dark to-darkMid px-9 py-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-accent/[0.08]" />

        <KostinLogo size={20} dark />

        <div className="relative z-10">
          <Badge className="bg-accent/20 text-accentBorder">UNTUK PEMILIK KOST</Badge>
          <h1 className="mt-3.5 font-heading text-[26px] font-extrabold leading-tight">
            Kelola kost-mu, terima sewa tepat waktu.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Listing, Smart Rent, screening penyewa, dan keuangan — semua dalam satu dasbor.
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5">
                <f.icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
                <span className="text-[13px] text-white/85">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-white/35">© 2026 Kostin · Temukan · Tinggal · Betah</div>
      </div>

      <div className="flex flex-1 items-center justify-center px-8 py-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
