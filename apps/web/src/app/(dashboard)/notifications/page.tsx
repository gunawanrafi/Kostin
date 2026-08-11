"use client";

import * as React from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WCard } from "@/components/ui/WCard";
import { cn } from "@/lib/utils";
import {
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/lib/hooks/useNotifications";
import type { AppNotification, NotificationEventType } from "@/lib/types";

type Category = "booking" | "pembayaran" | "sistem";
type FilterId = "semua" | "unread" | Category;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "unread", label: "Belum Dibaca" },
  { id: "booking", label: "Booking" },
  { id: "pembayaran", label: "Pembayaran" },
  { id: "sistem", label: "Sistem" },
];

// Maps the 5 event types notification-service emits onto the design's three
// category pills. NEW_INQUIRY sits under Booking because for an owner a new
// applicant *is* the start of a booking (the design's first row is exactly
// this: "Calon penyewa baru … Mengajukan sewa"). A null eventType — legal per
// the schema — falls through to Sistem.
const EVENT_CATEGORY: Record<NotificationEventType, Category> = {
  BOOKING_CONFIRMED: "booking",
  BOOKING_CANCELLED: "booking",
  NEW_INQUIRY: "booking",
  PAYMENT_SUCCESS: "pembayaran",
  OTP_REQUEST: "sistem",
};

function categoryOf(eventType: NotificationEventType | null): Category {
  return eventType ? EVENT_CATEGORY[eventType] : "sistem";
}

// Icon + tone per event type. Colour pairings follow the I1 artboard's
// iconBg/iconColor values; the glyphs are lucide rather than the design's
// emoji, matching how every other built dashboard page renders icons.
const EVENT_ICON: Record<NotificationEventType, { Icon: LucideIcon; bg: string; fg: string }> = {
  NEW_INQUIRY: { Icon: UserPlus, bg: "bg-accentSoft", fg: "text-accent" },
  PAYMENT_SUCCESS: { Icon: CreditCard, bg: "bg-successSoft", fg: "text-success" },
  BOOKING_CONFIRMED: { Icon: CheckCircle2, bg: "bg-successSoft", fg: "text-success" },
  BOOKING_CANCELLED: { Icon: AlertTriangle, bg: "bg-errorSoft", fg: "text-error" },
  OTP_REQUEST: { Icon: ShieldCheck, bg: "bg-infoSoft", fg: "text-info" },
};

const FALLBACK_ICON = { Icon: Bell, bg: "bg-bg", fg: "text-textMid" } as const;

function iconOf(eventType: NotificationEventType | null) {
  return eventType ? EVENT_ICON[eventType] : FALLBACK_ICON;
}

function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

// Whole-days elapsed, measured between calendar-day boundaries rather than
// raw elapsed ms — so 23:59 → 00:01 counts as "yesterday", not "0 days ago".
function daysAgo(iso: string, now: Date): number {
  return Math.floor((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
}

// Matches the design's relative timestamps: "09:42" today, then "Kemarin",
// "N hari lalu", "N minggu lalu", and an absolute date once it's a month old.
function formatTime(iso: string, now: Date): string {
  const date = new Date(iso);
  const days = daysAgo(iso, now);
  if (days <= 0) return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari lalu`;
  if (days < 28) return `${Math.floor(days / 7)} minggu lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const GROUPS = [
  { id: "today", label: "Hari Ini" },
  { id: "week", label: "Minggu Ini" },
  { id: "older", label: "Lebih Awal" },
] as const;

type GroupId = (typeof GROUPS)[number]["id"];

function groupOf(iso: string, now: Date): GroupId {
  const days = daysAgo(iso, now);
  if (days <= 0) return "today";
  if (days < 7) return "week";
  return "older";
}

function NotifRow({
  notification,
  now,
  onMarkRead,
}: {
  notification: AppNotification;
  now: Date;
  onMarkRead: (id: string) => void;
}): React.JSX.Element {
  const isUnread = notification.status === "UNREAD";
  const { Icon, bg, fg } = iconOf(notification.eventType);

  const content = (
    <>
      {isUnread ? (
        <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent" />
      ) : null}
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]", bg, fg)}>
        <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2.5">
          <span className="text-[13.5px] font-bold text-text">{notification.title}</span>
          <span className="shrink-0 text-[11.5px] text-textLight">
            {formatTime(notification.createdAt, now)}
          </span>
        </div>
        <div className="mt-[3px] text-[12.5px] leading-[1.5] text-textMid">{notification.body}</div>
      </div>
    </>
  );

  const rowClass = cn(
    "relative flex gap-[14px] border-b border-border px-[22px] py-4 last:border-b-0",
    isUnread ? "bg-accentSoft" : "bg-transparent",
  );

  // Already-read rows aren't interactive — there's nothing left to do to them,
  // so they stay plain divs rather than buttons that no-op on click.
  if (!isUnread) return <div className={rowClass}>{content}</div>;

  return (
    <button
      type="button"
      onClick={() => onMarkRead(notification.id)}
      aria-label={`Tandai sudah dibaca: ${notification.title}`}
      className={cn(rowClass, "w-full text-left transition-colors hover:bg-accentSoft/70")}
    >
      {content}
    </button>
  );
}

export default function NotificationsPage(): React.JSX.Element {
  const [filter, setFilter] = React.useState<FilterId>("semua");
  const { data, isLoading, isError } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();

  const notifications = React.useMemo(() => data?.items ?? [], [data]);

  const visible = React.useMemo(() => {
    if (filter === "semua") return notifications;
    if (filter === "unread") return notifications.filter((n) => n.status === "UNREAD");
    return notifications.filter((n) => categoryOf(n.eventType) === filter);
  }, [notifications, filter]);

  // `now` is pinned alongside the grouping rather than read per-row, so every
  // row in one render is bucketed and formatted against the same instant —
  // otherwise rows rendered either side of midnight could disagree about which
  // day group they belong to.
  const { grouped, now } = React.useMemo(() => {
    const current = new Date();
    const buckets: Record<GroupId, AppNotification[]> = { today: [], week: [], older: [] };
    for (const n of visible) buckets[groupOf(n.createdAt, current)].push(n);
    return { grouped: buckets, now: current };
  }, [visible]);

  // Guards against stacking requests: a click while one mark-as-read is still
  // in flight is dropped rather than queued. Combined with `retry: false` on
  // the mutation, a failing endpoint gets at most one request per deliberate
  // click instead of a rising pile of them.
  const handleMarkRead = (id: string): void => {
    if (markRead.isPending) return;
    markRead.mutate(id);
  };

  return (
    <>
      <WHeader
        trail={["Dashboard", "Notifikasi"]}
        title="Notifikasi"
        subtitle="Semua pemberitahuan booking, pembayaran, dan aktivitas akun Anda."
      />

      <WCard pad={8} className="inline-flex w-fit gap-1">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const showCount = f.id === "unread" && (unreadCount ?? 0) > 0;
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
              {showCount ? (
                <span
                  className={cn(
                    "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold",
                    active ? "bg-white text-accent" : "bg-accent text-white",
                  )}
                >
                  {unreadCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </WCard>

      {/* A failed mark-as-read used to fail silently — the row just stayed
          highlighted, which reads as "the click didn't register" and invites
          clicking again. Saying so plainly is what actually stops the
          repeat requests. */}
      {markRead.isError ? (
        <div className="rounded-lg border border-error bg-errorSoft px-4 py-3 text-[13px] text-error">
          Gagal menandai notifikasi sebagai dibaca. Coba lagi.
        </div>
      ) : null}

      {isError ? (
        <WCard pad={28} className="text-center text-sm text-error">
          Gagal memuat notifikasi. Coba muat ulang halaman.
        </WCard>
      ) : isLoading ? (
        <WCard pad={28} className="text-center text-sm text-textMid">
          Memuat notifikasi…
        </WCard>
      ) : notifications.length === 0 ? (
        <WCard pad={28} className="flex flex-col items-center gap-2 py-14 text-center">
          <Bell className="h-7 w-7 text-textLight" strokeWidth={1.75} />
          <span className="font-heading text-[15px] font-bold text-text">Belum ada notifikasi</span>
          <span className="text-[12.5px] text-textMid">
            Pemberitahuan booking, pembayaran, dan aktivitas akun Anda akan muncul di sini.
          </span>
        </WCard>
      ) : visible.length === 0 ? (
        <WCard pad={28} className="text-center text-sm text-textMid">
          Tidak ada notifikasi untuk filter ini.
        </WCard>
      ) : (
        <WCard noPadding className="overflow-hidden">
          {GROUPS.map((group) => {
            const items = grouped[group.id];
            if (items.length === 0) return null;
            return (
              <React.Fragment key={group.id}>
                <div className="bg-bg px-[22px] py-3.5 text-[11.5px] font-bold uppercase tracking-[0.4px] text-textMid">
                  {group.label}
                </div>
                {items.map((n) => (
                  <NotifRow key={n.id} notification={n} now={now} onMarkRead={handleMarkRead} />
                ))}
              </React.Fragment>
            );
          })}
        </WCard>
      )}
    </>
  );
}
