import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { KostinLogo } from "../../components";
import { borderRadius, colors, spacing, typography } from "../../theme";

export interface RoleScreenProps {
  /** User picked "Saya Mencari Kost" — continue into the renter auth funnel. */
  onSelectPenyewa: () => void;
}

interface RoleOption {
  id: "penyewa" | "pemilik";
  icon: string;
  label: string;
  description: string;
}

const ROLES: RoleOption[] = [
  {
    id: "penyewa",
    icon: "🔍",
    label: "Saya Mencari Kost",
    description: "Temukan kost terbaik sesuai preferensi & filter pilihanmu",
  },
  {
    id: "pemilik",
    icon: "🏠",
    label: "Saya Pemilik Kost",
    description: "Kelola properti, sewa, & calon penyewa (app terpisah)",
  },
];

// Role picker: Penyewa continues into this app's auth funnel; Pemilik lives
// in a separate app (KostIn Owner Mobile), so it just surfaces that instead
// of navigating anywhere — mirrors the source prototype's `app.toast(...)`.
export function RoleScreen({ onSelectPenyewa }: RoleScreenProps): React.JSX.Element {
  const handlePress = (role: RoleOption["id"]): void => {
    if (role === "penyewa") {
      onSelectPenyewa();
    } else {
      Alert.alert("Aplikasi Terpisah", "App Pemilik tersedia di 'KostIn Owner Mobile'");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <KostinLogo size={30} variant="light" />
        <Text style={styles.title}>Selamat datang! 👋</Text>
        <Text style={styles.subtitle}>Pilih peranmu untuk mulai.</Text>
      </View>

      <View style={styles.options}>
        {ROLES.map((role) => {
          const isPenyewa = role.id === "penyewa";
          return (
            <Pressable
              key={role.id}
              onPress={() => handlePress(role.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: isPenyewa ? colors.accent : colors.border,
                  backgroundColor: isPenyewa ? colors.accentSoft : colors.surface,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={styles.iconBox}>
                <Text style={styles.icon}>{role.icon}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{role.label}</Text>
                <Text style={styles.cardDescription}>{role.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["4xl"],
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.extrabold,
    fontSize: typography.fontSize["2xl"],
    color: colors.text,
    marginTop: spacing["2xl"],
    lineHeight: typography.fontSize["2xl"] * typography.lineHeight.tight,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textMid,
    marginTop: spacing.xs + 2,
  },
  options: {
    flex: 1,
    padding: spacing["2xl"],
    gap: spacing.md + 2,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderWidth: 2,
    borderRadius: borderRadius["2xl"],
    padding: spacing.xl,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: {
    fontSize: 26,
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md - 1,
    color: colors.text,
  },
  cardDescription: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textMid,
    marginTop: 3,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
});

export default RoleScreen;
