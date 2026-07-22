"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface WSidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Phase 1 nav only — matches the pages actually built in this dashboard.
// DESIGN_SYSTEM.md's full owner nav also lists Penyewa Aktif, Pesan, and
// Pengaturan; add them here once those routes exist (linking to them now
// would 404).
export const DEFAULT_NAV_ITEMS: WSidebarNavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Properti Saya", href: "/listings", icon: Building2 },
  { label: "Calon Penyewa", href: "/tenants", icon: Users },
  { label: "Keuangan", href: "/finance", icon: Wallet },
];

export interface WSidebarProps {
  navItems?: WSidebarNavItem[];
  ownerName?: string;
  ownerRole?: string;
  avatarUrl?: string;
}

// Mirrors the source prototype's WSidebar: 256px rail, owner identity block,
// accent-soft highlight on the active route (matched via usePathname).
export function WSidebar({
  navItems = DEFAULT_NAV_ITEMS,
  ownerName = "Pak Budi",
  ownerRole = "Pemilik Kost",
  avatarUrl,
}: WSidebarProps): React.JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-border bg-bgAlt px-4 py-6">
      <div>
        <div className="mb-5 flex items-center gap-3 p-2">
          <Avatar className="h-11 w-11 rounded-xl">
            <AvatarImage src={avatarUrl} alt={ownerName} />
            <AvatarFallback className="rounded-xl">{ownerName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-heading text-[13px] font-bold text-text">{ownerName}</div>
            <div className="text-[11px] text-textMid">{ownerRole}</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 font-heading text-[13px] font-semibold transition-colors",
                  isActive ? "bg-accentSoft text-accent" : "text-textMid hover:bg-bg",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export default WSidebar;
