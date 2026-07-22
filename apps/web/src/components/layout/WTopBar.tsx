"use client";

import * as React from "react";
import { Bell, LogOut, Settings, User as UserIcon } from "lucide-react";
import { KostinLogo } from "@/components/brand/KostinLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface WTopBarProps {
  ownerName?: string;
  avatarUrl?: string;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
}

// Mirrors the source prototype's WTopBar: 64px dark bar, logo left, notif
// bell (badge count) + avatar dropdown right.
export function WTopBar({
  ownerName = "Pak Budi",
  avatarUrl,
  notificationCount = 0,
  onNotificationsClick,
  onProfileClick,
  onSettingsClick,
  onLogout,
}: WTopBarProps): React.JSX.Element {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between bg-dark px-8 shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
      <KostinLogo size={18} dark />

      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={onNotificationsClick}
          aria-label="Notifikasi"
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] transition-colors hover:bg-white/[0.14]"
        >
          <Bell className="h-4 w-4 text-white/85" strokeWidth={2} />
          {notificationCount > 0 ? (
            <span className="absolute right-[5px] top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border-[1.5px] border-dark bg-accent text-[9px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          ) : null}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 border-l border-white/15 pl-4 outline-none">
            <Avatar className="h-8 w-8 ring-2 ring-accent">
              <AvatarImage src={avatarUrl} alt={ownerName} />
              <AvatarFallback className="text-xs">{ownerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-heading text-[13px] font-semibold text-white">{ownerName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onProfileClick?.()}>
              <UserIcon className="h-4 w-4" /> Profil Saya
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSettingsClick?.()}>
              <Settings className="h-4 w-4" /> Pengaturan
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onLogout?.()} className="text-error focus:bg-errorSoft">
              <LogOut className="h-4 w-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default WTopBar;
