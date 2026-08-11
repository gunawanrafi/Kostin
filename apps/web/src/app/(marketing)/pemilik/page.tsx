import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Building2, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { KostinLogo } from "@/components/brand/KostinLogo";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/WButton";
import { cn } from "@/lib/utils";

// Public marketing route — see src/middleware.ts's MARKETING_PATHS, which
// keeps /pemilik reachable both signed-out and signed-in. Fully static: no
// hooks, no fetching, so this stays a Server Component.
export const metadata: Metadata = {
  title: "KostIn untuk Pemilik Kost — Kelola kost-mu, terima sewa tepat waktu",
  description:
    "Listing, Smart Rent, screening penyewa, keuangan, dan analitik — semua dalam satu dasbor. Gratis pasang listing selama masa pembukaan.",
};

interface Feature {
  Icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    Icon: Building2,
    title: "Listing & Manajemen Properti",
    description: "Pasang & kelola banyak kost dari satu dasbor. Wizard terpandu, foto, harga, aturan.",
  },
  {
    Icon: Wallet,
    title: "Smart Rent Collection",
    description: "Tagihan & pengingat otomatis tiap bulan, late fee, dan pencairan saldo ke rekeningmu.",
  },
  {
    Icon: ShieldCheck,
    title: "Screening Penyewa",
    description: "Reputasi calon penyewa, kriteria otomatis, dan riwayat sewa sebelum kamu setuju.",
  },
  {
    Icon: BarChart3,
    title: "Analitik & Market Intelligence",
    description: "Occupancy, pendapatan, funnel konversi, dan benchmark harga area sekitarmu.",
  },
];

const STATS: { value: string; label: string }[] = [
  { value: "2.400+", label: "kamar terkelola" },
  { value: "94%", label: "sewa tepat waktu" },
  { value: "Rp 0", label: "biaya pasang listing" },
];

const FOOTER_NOTE = "© 2026 Kostin · Temukan · Tinggal · Betah";

export default function OwnerLandingPage(): JSX.Element {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-surface font-body">
      {/* ── Top nav ────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-border px-6 py-[18px] sm:px-12">
        <KostinLogo size={20} dark={false} onLight />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13.5px] font-semibold text-text transition-colors hover:text-accent"
          >
            Masuk
          </Link>
          <Link href="/register" className={cn(buttonVariants({ size: "sm" }))}>
            Daftar Gratis
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-dark to-darkMid px-6 py-14 text-white sm:px-12 sm:py-[56px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-80 w-80 rounded-full bg-accent/10"
        />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div>
            <Badge className="bg-accent/20 text-accentBorder">UNTUK PEMILIK KOST</Badge>

            <h1 className="mt-4 font-heading text-[32px] font-extrabold leading-[1.12] tracking-[-0.01em] sm:text-[38px] lg:text-[44px]">
              Kelola kost-mu,
              <br className="hidden sm:inline" /> terima sewa{" "}
              <span className="text-accent">tepat waktu.</span>
            </h1>

            <p className="mt-4 max-w-[440px] text-[15px] leading-[1.7] text-white/65">
              Listing, Smart Rent, screening penyewa, keuangan, dan analitik — semua dalam satu
              dasbor. Gratis pasang listing selama masa pembukaan.
            </p>

            <div className="mt-[26px] flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={cn(buttonVariants())}>
                Daftar Gratis Sekarang
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  // The shared outline variant is tuned for light surfaces —
                  // remapped here for the dark hero.
                  "border-white/25 bg-transparent text-white hover:bg-white/10",
                )}
              >
                Sudah punya akun? Masuk
              </Link>
            </div>

            <dl className="mt-9 flex flex-wrap gap-x-[34px] gap-y-6">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-heading text-[26px] font-extrabold text-white">
                      {stat.value}
                    </span>
                    <span className="mt-0.5 block text-xs text-white/50">{stat.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero visual. The design ships an empty <image-slot> here awaiting a
              real dashboard screenshot, so this stays an explicit placeholder
              frame rather than a mocked-up dashboard with invented figures.
              Drop a real screenshot in when there is one. */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-white/[0.12] bg-white/[0.04] shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
              <KostinLogo size={22} dark />
              <span className="text-[12.5px] text-white/40">Pratinjau dasbor pemilik</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="fitur" className="scroll-mt-6 px-6 py-14 sm:px-12">
        <div className="mx-auto mb-10 max-w-[620px] text-center">
          <span className="font-heading text-xs font-bold uppercase tracking-[0.14em] text-accent">
            Semua yang kamu butuh
          </span>
          <h2 className="mt-2.5 font-heading text-[24px] font-extrabold text-text sm:text-[30px]">
            Satu aplikasi untuk seluruh operasional kost
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {FEATURES.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="flex gap-4 rounded-2xl border border-border bg-surface p-6 sm:px-[26px]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accentSoft text-accent">
                <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-heading text-[17px] font-bold text-text">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-[1.6] text-textMid">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="mx-6 mb-14 rounded-[20px] border border-accentBorder bg-accentSoft px-6 py-11 text-center sm:mx-12 sm:px-10">
        <h2 className="font-heading text-[22px] font-extrabold text-text sm:text-[28px]">
          Siap menerima penyewa pertamamu?
        </h2>
        <p className="mx-auto mt-2.5 max-w-[480px] text-[14.5px] leading-[1.6] text-textMid">
          Daftar dalam 2 menit, verifikasi kepemilikan sekali, lalu pasang listing pertamamu gratis.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/register" className={cn(buttonVariants())}>
            Daftar Gratis Sekarang
          </Link>
          {/* No "how it works" page exists yet — anchors to the feature grid
              above rather than pointing at a route that would 404. */}
          <Link href="#fitur" className={cn(buttonVariants({ variant: "outline" }))}>
            Pelajari Cara Kerja
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="flex flex-col items-center gap-2 border-t border-border px-6 py-[22px] text-xs text-textLight sm:flex-row sm:justify-between sm:px-12">
        <span>{FOOTER_NOTE}</span>
        <span>Untuk Pemilik Kost</span>
      </footer>
    </div>
  );
}
