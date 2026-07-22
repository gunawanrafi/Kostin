import React from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { RegisterScreen, type RegisterFields } from "../../screens/auth";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export default function RegisterRoute(): React.JSX.Element {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const mutation = useMutation({
    mutationFn: (fields: RegisterFields) =>
      authApi.register({
        name: fields.name,
        email: fields.email,
        phone: fields.phone,
        password: fields.password,
      }),
    onSuccess: (result) => {
      // Registering already returns a valid token pair (status starts
      // PENDING_VERIFICATION) — store it now so the session survives if the
      // user abandons the OTP step, then finalize activation on the OTP screen.
      login(result.user, { accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken });
      router.push({ pathname: "/(auth)/otp", params: { phone: result.user.phone } });
    },
    onError: (err) => {
      Alert.alert("Registrasi gagal", err.message);
    },
  });

  return (
    <RegisterScreen
      onBack={() => router.back()}
      onSubmit={(fields) => mutation.mutate(fields)}
      onNavigateLogin={() => router.replace("/(auth)/login")}
      loading={mutation.isPending}
    />
  );
}
