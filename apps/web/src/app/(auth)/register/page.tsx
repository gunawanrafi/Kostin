"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CheckCircle2, CreditCard, Home, ShieldCheck, SmilePlus } from "lucide-react";
import { WButton } from "@/components/ui/WButton";
import { WField } from "@/components/ui/WField";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRegister } from "@/lib/hooks/useAuth";

interface ProfileFields {
  fullName: string;
  kostName: string;
  city: string;
  phone: string;
}

interface AccountFields {
  email: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
}

interface VerificationDoc {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  done: boolean;
}

const STEP_LABELS = ["Profil", "Akun", "Verifikasi Kepemilikan"];

export default function RegisterPage(): JSX.Element {
  const router = useRouter();
  const register = useRegister();
  const [step, setStep] = React.useState(0);
  const [profile, setProfile] = React.useState<ProfileFields>({ fullName: "", kostName: "", city: "", phone: "" });
  const [account, setAccount] = React.useState<AccountFields>({
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });
  const [docs, setDocs] = React.useState<VerificationDoc[]>([
    { id: "ktp", icon: <CreditCard className="h-5 w-5" />, label: "KTP Pemilik", description: "Foto KTP asli, jelas terbaca", done: false },
    { id: "property", icon: <Home className="h-5 w-5" />, label: "Foto Properti + Alamat", description: "Tampak depan kost & papan alamat", done: false },
    { id: "selfie", icon: <SmilePlus className="h-5 w-5" />, label: "Selfie Liveness Check", description: "Verifikasi wajah cocok dengan KTP", done: false },
  ]);
  const [submitError, setSubmitError] = React.useState<string | undefined>();

  const profileValid = Boolean(profile.fullName && profile.kostName && profile.city && profile.phone);
  const accountValid = Boolean(
    account.email && account.password.length >= 8 && account.password === account.confirmPassword && account.agree,
  );
  const allDocsUploaded = docs.every((d) => d.done);

  const handleProfileSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (profileValid) setStep(1);
  };

  const handleAccountSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (accountValid) setStep(2);
  };

  const handleFinish = async (): Promise<void> => {
    setSubmitError(undefined);
    try {
      // Owner verification docs (KTP/property photo/selfie) are collected
      // above but have no upload endpoint yet (Phase 2) — only the account
      // itself is created here.
      await register.mutateAsync({
        name: profile.fullName,
        email: account.email,
        phone: `+62${profile.phone}`,
        password: account.password,
        role: "OWNER",
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      const message = axios.isAxiosError<{ error?: { message?: string } }>(err)
        ? err.response
          ? err.response.data?.error?.message
          : "Tidak dapat terhubung ke server. Coba lagi."
        : err instanceof Error
          ? err.message
          : undefined;
      setSubmitError(message ?? "Gagal membuat akun. Coba lagi.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-accent">
          LANGKAH {step + 1} DARI {STEP_LABELS.length}
        </span>
      </div>

      {step === 0 ? (
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5">
          <Header title="Lengkapi Profil Anda" subtitle="Data ini muncul di listing sebagai identitas pemilik." />
          <WField
            label="Nama Lengkap (sesuai KTP)"
            placeholder="Budi Santoso"
            value={profile.fullName}
            onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
            required
          />
          <WField
            label="Nama Kost / Usaha"
            placeholder="Kos Griya Asri"
            value={profile.kostName}
            onChange={(e) => setProfile((p) => ({ ...p, kostName: e.target.value }))}
            required
          />
          <div className="flex gap-3">
            <WField
              label="Kota"
              placeholder="Malang"
              value={profile.city}
              onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
              required
            />
            <WField
              label="No. HP"
              prefix="+62"
              placeholder="812-XXXX-XXXX"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              required
            />
          </div>
          <WButton type="submit" fullWidth disabled={!profileValid}>
            Lanjut ke Buat Akun →
          </WButton>
        </form>
      ) : null}

      {step === 1 ? (
        <form onSubmit={handleAccountSubmit} className="flex flex-col gap-5">
          <Header title="Buat Akun Baru" subtitle="Amankan akunmu untuk mulai memasang listing." />
          <WField
            label="Email"
            type="email"
            placeholder="budi@email.com"
            value={account.email}
            onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
            required
          />
          <WField
            label="Kata Sandi"
            type="password"
            placeholder="Minimal 8 karakter"
            value={account.password}
            onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))}
            required
            note="Minimal 8 karakter"
          />
          <WField
            label="Konfirmasi Kata Sandi"
            type="password"
            placeholder="Ulangi kata sandi"
            value={account.confirmPassword}
            onChange={(e) => setAccount((a) => ({ ...a, confirmPassword: e.target.value }))}
            required
            error={
              account.confirmPassword && account.confirmPassword !== account.password
                ? "Kata sandi tidak cocok"
                : undefined
            }
          />
          <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-textMid">
            <input
              type="checkbox"
              checked={account.agree}
              onChange={(e) => setAccount((a) => ({ ...a, agree: e.target.checked }))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-accent focus:ring-accent"
            />
            Saya menyetujui <span className="font-semibold text-accent">Syarat Mitra Pemilik</span> & memahami komisi
            layanan KostIn.
          </label>
          <WButton type="submit" fullWidth disabled={!accountValid}>
            Buat Akun & Verifikasi
          </WButton>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-5">
          <span className="text-[11px] font-bold text-accent">SETELAH DAFTAR · SEKALI SAJA</span>
          <Header
            title="Verifikasi Kepemilikan"
            subtitle="Lindungi calon penyewa dari listing palsu. Lolos verifikasi = badge Verified Partner & listing diprioritaskan."
          />
          <div className="flex flex-col gap-2.5">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  "flex items-center gap-3.5 rounded-xl border-[1.5px] px-4 py-3.5",
                  doc.done ? "border-success bg-successSoft" : "border-border bg-surface",
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-textSec">
                  {doc.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-text">{doc.label}</div>
                  <div className="text-xs text-textMid">{doc.description}</div>
                </div>
                {doc.done ? (
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Selesai
                  </Badge>
                ) : (
                  <WButton
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, done: true } : d)))
                    }
                  >
                    Unggah
                  </WButton>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-info bg-infoSoft px-3.5 py-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-info" />
            <span className="text-xs leading-relaxed text-info">
              Dokumen hanya untuk verifikasi internal & tidak ditampilkan ke publik.
            </span>
          </div>
          {submitError ? <p className="text-[12.5px] font-medium text-error">{submitError}</p> : null}
          <WButton
            type="button"
            fullWidth
            disabled={!allDocsUploaded}
            loading={register.isPending}
            onClick={handleFinish}
          >
            Kirim untuk Ditinjau
          </WButton>
        </div>
      ) : null}

      {step === 0 ? (
        <p className="text-center text-[13px] text-textMid">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-bold text-accent">
            Masuk
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="font-heading text-2xl font-extrabold text-text">{title}</h2>
      <p className="text-[13.5px] leading-relaxed text-textMid">{subtitle}</p>
    </div>
  );
}
