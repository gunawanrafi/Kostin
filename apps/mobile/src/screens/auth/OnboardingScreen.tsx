import React, { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { KButton } from "../../components";
import { colors, spacing, typography } from "../../theme";

export interface OnboardingScreenProps {
  /** Called on "Lewati" (skip) or on the final slide's CTA — both land on the role screen. */
  onComplete: () => void;
}

interface Slide {
  emoji: string;
  title: string;
  subtitle: string;
  // One-off decorative tints, not theme tokens — see DESIGN_SYSTEM.md
  // ("Not carried into tokens... one-off decorative tints").
  tone: string;
}

const SLIDES: Slide[] = [
  {
    emoji: "🎯",
    title: "Temukan Kost yang Benar-Benar Cocok",
    subtitle: "Cocokkan preferensi & gaya hidupmu — bukan sekadar filter biasa.",
    tone: "#FFE8E8",
  },
  {
    emoji: "📸",
    title: "Lihat Kondisi Asli Sebelum Survei",
    subtitle: "Foto akurat, galeri lengkap, dan review terverifikasi.",
    tone: "#E8F0FF",
  },
  {
    emoji: "🛡️",
    title: "Deposit Aman & Transaksi Transparan",
    subtitle: "Dana depositmu dipegang KostIn — kembali penuh bila tak ada kerusakan.",
    tone: "#E8FBF1",
  },
];

// 3-slide swipeable carousel with a skip action; mirrors the source
// prototype's OnboardingScreen (dot indicators + "Lanjut" / "Mulai Sekarang" CTA).
export function OnboardingScreen({ onComplete }: OnboardingScreenProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const goToSlide = (next: number): void => {
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const handlePrimaryPress = (): void => {
    if (isLast) {
      onComplete();
    } else {
      goToSlide(index + 1);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.skipRow}>
        <KButton label="Lewati" variant="ghost" size="sm" onPress={onComplete} />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        style={styles.carousel}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.iconBox, { backgroundColor: slide.tone }]}>
              <Text style={styles.emoji}>{slide.emoji}</Text>
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === index ? 22 : 7,
                  backgroundColor: i === index ? colors.accent : colors.border,
                },
              ]}
            />
          ))}
        </View>
        <KButton
          label={isLast ? "Mulai Sekarang" : "Lanjut"}
          variant="primary"
          size="lg"
          fullWidth
          onPress={handlePrimaryPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  skipRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  carousel: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
    gap: spacing.xl,
  },
  iconBox: {
    width: 200,
    height: 200,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 84,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.extrabold,
    fontSize: typography.fontSize["2xl"],
    color: colors.text,
    textAlign: "center",
    lineHeight: typography.fontSize["2xl"] * typography.lineHeight.tight,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textMid,
    textAlign: "center",
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["3xl"],
    gap: spacing.xl,
  },
  dots: {
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
});

export default OnboardingScreen;
