"use client";

import * as React from "react";
import { Check, CircleDashed, Lock, MessageCircle, Wallet } from "lucide-react";
import { WHeader } from "@/components/layout/WHeader";
import { WButton } from "@/components/ui/WButton";
import { WCard } from "@/components/ui/WCard";
import { WField } from "@/components/ui/WField";
import { WSectionCard } from "@/components/ui/WSectionCard";
import { cn } from "@/lib/utils";
import { useCurrentUser, useUpdateMe } from "@/lib/hooks/useAuth";
import { passwordChangeErrorField, useChangePassword } from "@/lib/hooks/usePasswordReset";

// ── Informasi Akun ────────────────────────────────────────────────────────
//
// SCOPE: of the three fields the H1 design puts in this block, only the name
// is writable today. PATCH /users/me (user-service's updateMeSchema) accepts
// name/bio/university/major/yearOfStudy — not email or phone. Those two are
// unique sign-in identifiers: changing the phone moves where OTP and
// password-reset codes are delivered, and changing the email moves the login
// address, so both need a verify-the-new-value step that doesn't exist yet.
// They're shown here with their real values and marked read-only rather than
// rendered as inputs that would 400 on save.
function AccountSection(): React.JSX.Element {
  const { data: user, isLoading, isError } = useCurrentUser();
  const updateMe = useUpdateMe();

  // null means "untouched — mirror whatever the server last said", so the
  // field picks up the fetched name without an effect, and re-syncs after a
  // save instead of holding a stale local copy.
  const [draftName, setDraftName] = React.useState<string | null>(null);
  const name = draftName ?? user?.name ?? "";

  const trimmed = name.trim();
  const isDirty = user ? trimmed !== user.name : false;
  const tooShort = trimmed.length > 0 && trimmed.length < 2;

  const save = (): void => {
    updateMe.mutate(
      { name: trimmed },
      // Drop the local draft so the field falls back to the saved value —
      // which is also what un-dirties the form and disables the button.
      { onSuccess: () => setDraftName(null) },
    );
  };

  if (isError) {
    return (
      <WSectionCard title="Informasi Akun">
        <p className="text-[13px] text-error">
          Gagal memuat data akun. Coba muat ulang halaman.
        </p>
      </WSectionCard>
    );
  }

  return (
    <WSectionCard title="Informasi Akun">
      {isLoading ? (
        <p className="text-[13px] text-textMid">Memuat data akun…</p>
      ) : (
        <>
          <WField
            label="Nama Lengkap"
            value={name}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Nama sesuai identitas"
            autoComplete="name"
            disabled={updateMe.isPending}
            error={tooShort ? "Nama minimal 2 karakter" : undefined}
            note="Nama ini tampil pada listing dan percakapan dengan calon penyewa."
          />

          <div className="flex flex-col gap-4 sm:flex-row">
            <WField
              label="WhatsApp Aktif"
              value={user?.phone ?? ""}
              readOnly
              disabled
              note="Nomor ini menerima kode OTP dan reset kata sandi. Penggantian butuh verifikasi nomor baru — tersedia di fase berikutnya."
            />
            <WField
              label="Email Pemberitahuan"
              value={user?.email ?? ""}
              readOnly
              disabled
              note="Email ini juga dipakai untuk masuk. Penggantian butuh verifikasi alamat baru — tersedia di fase berikutnya."
            />
          </div>

          {updateMe.isError ? (
            <div className="rounded-lg border border-error bg-errorSoft px-3.5 py-2.5 text-[12.5px] text-error">
              {updateMe.error.message}
            </div>
          ) : null}
          {updateMe.isSuccess && !isDirty ? (
            <div className="flex items-center gap-2 rounded-lg border border-success bg-successSoft px-3.5 py-2.5 text-[12.5px] text-success">
              <Check className="h-3.5 w-3.5" /> Perubahan tersimpan.
            </div>
          ) : null}

          <div className="flex justify-end">
            <WButton
              type="button"
              onClick={save}
              loading={updateMe.isPending}
              disabled={!isDirty || tooShort}
            >
              Simpan Perubahan
            </WButton>
          </div>
        </>
      )}
    </WSectionCard>
  );
}

// ── Keamanan ──────────────────────────────────────────────────────────────

// Mirrors the forgot-password screen's checklist. Only the first is enforced
// (it matches auth-service's passwordSchema); the other two are guidance —
// blocking on them here would reject passwords the API accepts.
const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "Minimal 8 karakter", test: (v) => v.length >= 8 },
  { label: "Mengandung angka", test: (v) => /\d/.test(v) },
  { label: "Huruf besar & kecil", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
];

function SecuritySection(): React.JSX.Element {
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  // Checked client-side too so the obvious case doesn't cost a round trip;
  // auth-service enforces it as well (PASSWORD_UNCHANGED).
  const isSameAsCurrent = newPassword.length > 0 && newPassword === currentPassword;
  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 8 && passwordsMatch && !isSameAsCurrent;

  // Which field the server blamed, so the message lands on the input that
  // caused it instead of only in a banner at the top.
  const failedField = changePassword.isError ? passwordChangeErrorField(changePassword.error) : null;
  const serverMessage = changePassword.isError ? changePassword.error.message : undefined;

  const submit = (): void => {
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        // Clear the form on success — leaving the old password sitting in a
        // filled-in field invites a second submit that would now fail.
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      },
    );
  };

  return (
    <WSectionCard title="Keamanan">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <WField
          label="Kata Sandi Saat Ini"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Masukkan kata sandi Anda saat ini"
          disabled={changePassword.isPending}
          error={failedField === "current" ? serverMessage : undefined}
        />

        <div className="flex flex-col gap-4 sm:flex-row">
          <WField
            label="Kata Sandi Baru"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            disabled={changePassword.isPending}
            error={
              isSameAsCurrent
                ? "Kata sandi baru harus berbeda dari yang sekarang"
                : failedField === "new"
                  ? serverMessage
                  : undefined
            }
          />
          <WField
            label="Konfirmasi Kata Sandi Baru"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Ulangi kata sandi baru"
            disabled={changePassword.isPending}
            error={confirmPassword && !passwordsMatch ? "Kata sandi tidak cocok" : undefined}
          />
        </div>

        <div className="flex flex-col gap-2">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(newPassword);
            return (
              <div
                key={rule.label}
                className={cn(
                  "flex items-center gap-2 text-[12.5px]",
                  met ? "text-success" : "text-textLight",
                )}
              >
                {met ? <Check className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
                {rule.label}
              </div>
            );
          })}
        </div>

        {/* Errors that don't belong to a specific field (offline, 500, an
            expired session) still need to be said out loud. */}
        {changePassword.isError && failedField === null ? (
          <div className="rounded-lg border border-error bg-errorSoft px-3.5 py-2.5 text-[12.5px] text-error">
            {serverMessage}
          </div>
        ) : null}
        {changePassword.isSuccess ? (
          <div className="flex items-center gap-2 rounded-lg border border-success bg-successSoft px-3.5 py-2.5 text-[12.5px] text-success">
            <Check className="h-3.5 w-3.5" /> Kata sandi berhasil diubah. Anda tetap masuk di
            perangkat ini.
          </div>
        ) : null}

        <div className="flex justify-end">
          <WButton type="submit" loading={changePassword.isPending} disabled={!canSubmit}>
            Ubah Kata Sandi
          </WButton>
        </div>
      </form>
    </WSectionCard>
  );
}

// ── Blocks the design shows that nothing can back yet ──────────────────────
//
// Rekening pencairan needs payment-service + Midtrans payouts, and the
// auto-accept score needs ai-service's matching model — neither exists in
// Phase 1. Rendered as inert, clearly-labelled panels rather than real
// controls: an input that 404s on save, or a slider whose value is never read,
// reads as broken rather than as unbuilt.
const UPCOMING_BLOCKS = [
  {
    icon: Wallet,
    title: "Rekening Pencairan",
    description:
      "Rekening tujuan pencairan dana sewa. Menunggu payment-service dan integrasi pencairan Midtrans.",
  },
  {
    icon: Lock,
    title: "Skor Minimum Auto-Terima",
    description:
      "Ambang skor kecocokan calon penyewa untuk diterima otomatis. Menunggu model pencocokan di ai-service.",
  },
] as const;

function UpcomingSection(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {UPCOMING_BLOCKS.map(({ icon: Icon, title, description }) => (
        <WCard key={title} className="flex items-start gap-4 opacity-70">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-bg text-textLight">
            <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-heading text-[15px] font-bold text-textMid">{title}</span>
              <span className="rounded-full bg-warningSoft px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.3px] text-warning">
                Tersedia di fase berikutnya
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-[1.6] text-textLight">{description}</p>
          </div>
        </WCard>
      ))}
    </div>
  );
}

export default function SettingsPage(): React.JSX.Element {
  return (
    <>
      <WHeader
        trail={["Dashboard", "Pengaturan"]}
        title="Pengaturan"
        subtitle="Kelola informasi akun dan keamanan kata sandi Anda."
      />

      <AccountSection />
      <SecuritySection />
      <UpcomingSection />

      {/* The design's H1 board also lists a WhatsApp notification toggle;
          notification-service has no per-user channel preference to store it
          in, so it's omitted entirely rather than shown as a switch that
          resets on reload. */}
      <p className="flex items-center gap-2 text-[12px] text-textLight">
        <MessageCircle className="h-3.5 w-3.5" />
        Preferensi notifikasi per kanal belum tersedia — semua pemberitahuan dikirim ke aplikasi.
      </p>
    </>
  );
}
