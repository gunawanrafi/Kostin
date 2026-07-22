import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { useFonts as useRubikFonts, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold, Rubik_800ExtraBold } from "@expo-google-fonts/rubik";

// Keep the splash screen up until fonts are loaded — every screen in
// src/screens/{auth,main} renders text with fontFamily: "Rubik" | "Inter"
// (see src/theme/index.ts), so nothing should paint before they're ready.
void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout(): React.JSX.Element | null {
  const [interLoaded] = useInterFonts({
    // Base weight aliased to the plain "Inter" family name every component
    // already uses; the named weights are also loaded so screens can opt
    // into an exact weight later without a fonts-loading change here.
    Inter: Inter_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [rubikLoaded] = useRubikFonts({
    Rubik: Rubik_700Bold,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
    Rubik_800ExtraBold,
  });

  const fontsLoaded = interLoaded && rubikLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
