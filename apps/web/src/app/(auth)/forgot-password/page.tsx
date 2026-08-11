"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CheckCircle2, CircleDashed, KeyRound, MessageCircle } from "lucide-react";
import { WButton } from "@/components/ui/WButton";
import { WField } from "@/components/ui/WField";
import { cn } from "@/lib/utils";
import {
  isResetCodeError,
  useForgotPassword,
  useResetPassword,
} from "@/lib/hooks/usePasswordReset";

// Mirrors auth-service's OTP_REQUEST_COOLDOWN_SEC default. The forgot
// response doesn't return the cooldown, so this is the client's best estimate
// of when a resend will actually produce a new code.
const RESEND_COOLDOWN_SEC = 60;
const CODE_LENGTH = 6;

type Step = "email" | "code" | "password" | "done";

function AuthHead({ title, subtitle }: { title: string; subtitle: string }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="font-heading text-2xl font-extrabold text-text">{title}</h2>
      <p className="text-[13.5px] leading-relaxed text-textMid">{subtitle}</p>
    </div>
  );
}

function IconWell({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "accent" | "info";
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex h-[60px] w-[60px] items-center justify-center rounded-2xl",
        tone === "accent" ? "bg-accentSoft text-accent" : "bg-infoSoft text-info",
      )}
    >
      {children}
    </div>
  );
}

// Six single-character boxes backed by one real input, so paste, autofill and
// mobile keyboards behave normally instead of fighting six separate fields.
function CodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Kode verifikasi 6 digit"
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <div className="pointer-events-none flex gap-2.5">
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const digit = value[i] ?? "";
          return (
            <div
              key={i}
              className={cn(
                "flex h-[60px] w-[52px] items-center justify-center rounded-xl border-[1.5px] font-heading text-[22px] font-extrabold text-text",
                digit ? "border-accent bg-accentSoft" : "border-border bg-bg",
              )}
            >
              {digit}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "Minimal 8 karakter", test: (v) => v.length >= 8 },
  { label: "Mengandung angka", test: (v) => /\d/.test(v) },
  { label: "Huruf besar & kecil", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
];

export default function ForgotPasswordPage(): React.JSX.Element {
  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [cooldown, setCooldown] = React.useState(0);

  const forgot = useForgotPassword();
  const reset = useResetPassword();

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async (): Promise<void> => {
    setError(undefined);
    try {
      await forgot.mutateAsync(email);
      setCooldown(RESEND_COOLDOWN_SEC);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim kode. Coba lagi.");
    }
  };

  const submitNewPassword = async (): Promise<void> => {
    setError(undefined);
    try {
      await reset.mutateAsync({ email, code, newPassword: password });
      // Deliberately not auto-signed-in: the reset issues no tokens, so the
      // owner confirms and signs in with the new password.
      setStep("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan kata sandi.";
      // A bad/expired code only surfaces here (there's no separate verify
      // endpoint), so send the user back to the code step rather than
      // leaving them staring at the password form.
      if (isResetCodeError(err)) {
        setCode("");
        setStep("code");
        setError(`${message} Silakan periksa kembali kode Anda.`);
        return;
      }
      setError(message);
    }
  };

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  // Matches auth-service's passwordSchema (min 8). The other two rules are
  // shown as guidance — enforcing them here would reject passwords the API
  // accepts.
  const passwordValid = password.length >= 8 && passwordsMatch;

  const errorBanner = error ? (
    <div className="rounded-lg border border-error bg-errorSoft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-error">
      {error}
    </div>
  ) : null;

  if (step === "email") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendCode();
        }}
        className="flex flex-col gap-5"
      >
        <IconWell tone="accent">
          <KeyRound className="h-7 w-7" strokeWidth={2} />
        </IconWell>
        <AuthHead
          title="Lupa Kata Sandi?"
          subtitle="Masukkan email terdaftar. Kami kirim kode untuk mengatur ulang kata sandi."
        />
        {errorBanner}
        <WField
          label="Email"
          type="email"
          placeholder="budi@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <WButton type="submit" fullWidth loading={forgot.isPending} disabled={!email}>
          Kirim Kode Reset
        </WButton>
        <p className="text-center text-[13px] text-textMid">
          Ingat kata sandimu?{" "}
          <Link href="/login" className="font-bold text-accent">
            Kembali ke Masuk
          </Link>
        </p>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(undefined);
          setStep("password");
        }}
        className="flex flex-col gap-5"
      >
        <IconWell tone="info">
          <MessageCircle className="h-7 w-7" strokeWidth={2} />
        </IconWell>
        {/* The design's copy says the code goes to the user's email. It does
            not: this project has no email transport, so auth-service sends it
            over WhatsApp to the phone on the account. Saying "email" here
            would send owners to an inbox that will never receive anything. */}
        <AuthHead
          title="Verifikasi Kode"
          subtitle="Kami kirim 6 digit kode ke WhatsApp nomor yang terdaftar pada akun ini. Jika email tersebut terdaftar, kode akan segera masuk."
        />
        {errorBanner}
        <CodeInput value={code} onChange={setCode} />
        <p className="text-[13px] text-textMid">
          Tidak menerima kode?{" "}
          {cooldown > 0 ? (
            <span className="text-textLight">
              Kirim ulang (0:{String(cooldown).padStart(2, "0")})
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={forgot.isPending}
              className="font-bold text-accent disabled:opacity-50"
            >
              Kirim ulang
            </button>
          )}
        </p>
        <WButton type="submit" fullWidth disabled={code.length !== CODE_LENGTH}>
          Verifikasi
        </WButton>
        <button
          type="button"
          onClick={() => {
            setError(undefined);
            setStep("email");
          }}
          className="text-center text-[13px] text-textMid"
        >
          Ganti email
        </button>
      </form>
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col gap-5">
        <IconWell tone="accent">
          <CheckCircle2 className="h-7 w-7 text-success" strokeWidth={2} />
        </IconWell>
        <AuthHead
          title="Kata Sandi Diperbarui"
          subtitle="Kata sandi Anda berhasil diubah. Silakan masuk menggunakan kata sandi baru."
        />
        <Link href="/login" className="w-full">
          <WButton type="button" fullWidth>
            Masuk Sekarang
          </WButton>
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submitNewPassword();
      }}
      className="flex flex-col gap-5"
    >
      <AuthHead
        title="Buat Kata Sandi Baru"
        subtitle="Kata sandi baru harus berbeda dari yang pernah digunakan."
      />
      {errorBanner}
      <WField
        label="Kata Sandi Baru"
        type="password"
        placeholder="Minimal 8 karakter"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
      />
      <WField
        label="Konfirmasi Kata Sandi"
        type="password"
        placeholder="Ulangi kata sandi"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
        error={
          confirmPassword && !passwordsMatch ? "Kata sandi tidak cocok" : undefined
        }
      />

      <div className="flex flex-col gap-2">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
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

      <WButton type="submit" fullWidth loading={reset.isPending} disabled={!passwordValid}>
        Simpan Kata Sandi
      </WButton>
    </form>
  );
}
