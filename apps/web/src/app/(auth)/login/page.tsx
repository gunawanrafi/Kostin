"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { WButton } from "@/components/ui/WButton";
import { WField } from "@/components/ui/WField";
import { useLogin } from "@/lib/hooks/useAuth";

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(undefined);
    try {
      await login.mutateAsync({ identifier: email, password });
      router.push("/");
      router.refresh();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          // Request never reached the server (offline, DNS failure, timeout, etc.)
          // — never show the raw axios/network message here.
          setError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
          return;
        }
        if (err.response.status === 401 || err.response.status === 400) {
          setError("Email atau password salah");
          return;
        }
      }
      // Any other failure (5xx, unexpected shape, etc.) — never surface the
      // raw API/error message to the user.
      setError("Terjadi kesalahan. Silakan coba lagi.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-2xl font-extrabold text-text">Selamat Datang Kembali</h2>
        <p className="text-[13.5px] leading-relaxed text-textMid">Masuk untuk mengelola properti kost Anda.</p>
      </div>

      <WField
        label="Email"
        type="email"
        placeholder="budi@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <WField
        label="Kata Sandi"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        error={error}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[12.5px] text-textMid">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          />
          Ingat saya
        </label>
        <Link href="/forgot-password" className="text-[12.5px] font-semibold text-accent">
          Lupa kata sandi?
        </Link>
      </div>

      <WButton type="submit" fullWidth loading={login.isPending}>
        Masuk
      </WButton>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11.5px] text-textLight">atau</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Google sign-in is BLOCKED ON CONFIG, not on code. The full path
          exists: the browser mints a Google ID token via Google Identity
          Services, POSTs it to /api/auth/login/google (built), which forwards
          to auth-service POST /auth/login/google (built) and sets the same
          httpOnly cookies as email/password login.
          What's missing is the credential:
            1. GOOGLE_CLIENT_ID — empty in .env, so auth-service's
               GoogleOAuthVerifier has audience "" and rejects every token.
            2. NEXT_PUBLIC_GOOGLE_CLIENT_ID — does not exist, so the browser
               has nothing to initialise Google Identity Services with and
               cannot obtain an ID token in the first place.
          Left visibly disabled rather than wired to a handler that would
          always 401, and rather than a silent no-op onClick. Enable this and
          add the GIS call once a client ID is provisioned. */}
      <span
        title="Login Google belum dikonfigurasi (GOOGLE_CLIENT_ID belum diisi)"
        className="inline-flex w-full"
      >
        <WButton type="button" variant="outline" fullWidth icon={<GoogleIcon />} disabled aria-disabled>
          Lanjut dengan Google
        </WButton>
      </span>

      <p className="text-center text-[13px] text-textMid">
        Belum punya akun?{" "}
        <Link href="/register" className="font-bold text-accent">
          Daftar sekarang
        </Link>
      </p>
    </form>
  );
}

function GoogleIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3c-7.7 0-14.4 4.4-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 35.7 26.9 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 40.6 16.2 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.9 36 45 30.5 45 24c0-1.4-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
