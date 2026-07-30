import { WSidebar } from "@/components/layout/WSidebar";
import { DashboardTopBar } from "@/components/layout/DashboardTopBar";

const FOOTER_LINKS = ["Pusat Bantuan", "Kebijakan Privasi", "Syarat & Ketentuan"];

// Owner dashboard shell: dark WTopBar + WSidebar rail + scrollable content +
// a footer pinned below the sidebar/content row — mirrors the source
// prototype's WPage.
export default function DashboardLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-bgAlt font-body">
      <DashboardTopBar />
      <div className="flex flex-1 items-stretch">
        <WSidebar />
        <main className="flex min-w-0 flex-1 flex-col gap-7 px-12 py-10">{children}</main>
      </div>
      <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-accentBorder px-8 py-5">
        <div>
          <div className="font-heading text-[15px] font-bold text-accent">Kostin</div>
          <div className="mt-0.5 text-[11px] text-textLight">© 2026 Kostin. Temukan · Tinggal · Betah.</div>
        </div>
        <div className="flex gap-7">
          {FOOTER_LINKS.map((link) => (
            <span key={link} className="text-xs text-textMid underline underline-offset-2">
              {link}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
