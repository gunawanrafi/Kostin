import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { SplashScreen } from "../../screens/auth";
import { useAuthStore } from "../../store/authStore";

// Navigates once BOTH the splash screen's own 1.5s timer has fired AND the
// persisted auth store has rehydrated — whichever finishes last — so a
// returning, already-authenticated user never flashes onboarding/role
// before landing on (main)/home.
export default function SplashRoute(): React.JSX.Element {
  const router = useRouter();
  const [timerDone, setTimerDone] = useState(false);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!timerDone || !hasHydrated) return;
    router.replace(isAuthenticated ? "/(main)/home" : "/(auth)/onboarding");
  }, [timerDone, hasHydrated, isAuthenticated, router]);

  return <SplashScreen onFinish={() => setTimerDone(true)} />;
}
