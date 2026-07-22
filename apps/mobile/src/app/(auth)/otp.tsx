import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { OTPScreen } from "../../screens/auth";
import { authApi, ApiRequestError } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export default function OtpRoute(): React.JSX.Element {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const login = useAuthStore((s) => s.login);
  const normalizedPhone = phone ?? "";

  const verify = useMutation({
    mutationFn: (code: string) => authApi.verifyOtp({ phone: normalizedPhone, code }),
    onSuccess: (result) => {
      login(result.user, { accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken });
      router.replace("/(main)/home");
    },
  });

  const resend = useMutation({
    mutationFn: () => authApi.requestOtp({ phone: normalizedPhone }),
  });

  const errorMessage = verify.error instanceof ApiRequestError ? verify.error.message : undefined;

  return (
    <OTPScreen
      onBack={() => router.back()}
      phone={normalizedPhone}
      onVerify={(code) => verify.mutate(code)}
      onResend={() => resend.mutate()}
      {...(errorMessage ? { error: errorMessage } : {})}
    />
  );
}
