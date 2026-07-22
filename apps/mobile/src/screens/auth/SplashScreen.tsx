import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { KostinLogo } from "../../components";
import { colors, spacing, typography } from "../../theme";

export interface SplashScreenProps {
  /** Called once the 1.5s splash timer elapses — advance to onboarding. */
  onFinish?: () => void;
}

const SPLASH_DURATION_MS = 1500;

// Dark branded splash: wordmark + tagline + a bottom progress bar that fills
// over SPLASH_DURATION_MS, then auto-advances (mirrors the source prototype's
// `setTimeout(() => nav.replace("onboarding"), 1500)`).
export function SplashScreen({ onFinish }: SplashScreenProps): React.JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animates `width` (not `transform`), so this can't use the native
    // driver — fine for a one-shot splash bar with no scroll/gesture nearby.
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: SPLASH_DURATION_MS,
      useNativeDriver: false,
    });
    animation.start();

    const timer = setTimeout(() => onFinish?.(), SPLASH_DURATION_MS);
    return () => {
      clearTimeout(timer);
      animation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />

      <View style={styles.content}>
        <KostinLogo size={42} variant="dark" />
        <Text style={styles.tagline}>TEMUKAN · TINGGAL · BETAH</Text>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,90,95,0.07)",
  },
  blobTop: {
    top: 80,
    right: -50,
    width: 200,
    height: 200,
  },
  blobBottom: {
    bottom: 120,
    left: -50,
    width: 170,
    height: 170,
    backgroundColor: "rgba(255,90,95,0.05)",
  },
  content: {
    alignItems: "center",
    gap: spacing.lg + 2,
  },
  tagline: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm - 1,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  progressTrack: {
    position: "absolute",
    bottom: 60,
    width: 160,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },
});

export default SplashScreen;
