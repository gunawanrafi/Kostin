import React from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ProfilScreen } from "../../screens/main";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

export default function ProfilRoute(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async (): Promise<void> => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Logout is best-effort server-side — the client session is cleared
        // regardless so the user is never stuck unable to log out.
      }
    }
    logout();
    queryClient.clear();
    router.replace("/(auth)/login");
  };

  return (
    <ProfilScreen
      name={user?.name ?? ""}
      email={user?.email ?? ""}
      avatarUrl={user?.avatarUrl}
      onEditProfile={() => Alert.alert("Segera hadir", "Edit profil belum tersedia.")}
      onLifestyleQuiz={() => Alert.alert("Segera hadir", "Lifestyle quiz belum tersedia.")}
      onLogout={() => void handleLogout()}
    />
  );
}
