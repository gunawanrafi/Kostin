import React from "react";
import { useRouter } from "expo-router";
import { RoleScreen } from "../../screens/auth";

export default function RoleRoute(): React.JSX.Element {
  const router = useRouter();
  return <RoleScreen onSelectPenyewa={() => router.replace("/(auth)/login")} />;
}
