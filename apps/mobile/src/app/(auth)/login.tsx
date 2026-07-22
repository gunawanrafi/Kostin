import React from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { LoginScreen } from "../../screens/auth";
import { authApi, ApiRequestError } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export default function LoginRoute(): React.JSX.Element {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      login(result.user, { accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken });
      router.replace("/(main)/home");
    },
  });

  const errorMessage = mutation.error instanceof ApiRequestError ? mutation.error.message : undefined;

  return (
    <LoginScreen
      onBack={() => router.back()}
      onLogin={(identifier, password) => mutation.mutate({ identifier, password })}
      onNavigateRegister={() => router.push("/(auth)/register")}
      onForgotPassword={() => Alert.alert("Segera hadir", "Reset kata sandi belum tersedia.")}
      onGoogleSignIn={() => Alert.alert("Segera hadir", "Masuk dengan Google belum tersedia.")}
      loading={mutation.isPending}
      {...(errorMessage ? { error: errorMessage } : {})}
    />
  );
}
