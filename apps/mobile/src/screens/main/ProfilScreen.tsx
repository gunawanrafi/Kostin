import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../theme";

export interface ProfilScreenProps {
  name: string;
  email: string;
  avatarUrl?: string | null | undefined;
  verifiedLabel?: string;
  onEditProfile: () => void;
  onLifestyleQuiz: () => void;
  onLogout: () => void;
}

interface MenuItem {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
}

// Profil tab: dark avatar header + a menu card (Edit Profil, Lifestyle
// Quiz), with Logout surfaced separately below — mirrors the source
// prototype's ProfilScreen header/menu-card/footer structure.
export function ProfilScreen({
  name,
  email,
  avatarUrl,
  verifiedLabel = "✓ Mahasiswa Terverifikasi",
  onEditProfile,
  onLifestyleQuiz,
  onLogout,
}: ProfilScreenProps): React.JSX.Element {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const menu: MenuItem[] = [
    { icon: "✏️", label: "Edit Profil", description: "Nama, foto, kampus, kontak", onPress: onEditProfile },
    { icon: "🛋️", label: "Lifestyle Quiz", description: "Perbarui preferensi & gaya hidupmu", onPress: onLifestyleQuiz },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
            {verifiedLabel ? (
              <Text style={styles.verifiedBadge}>{verifiedLabel}</Text>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.menuCard}>
          {menu.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={[styles.menuRow, i < menu.length - 1 && styles.menuRowBorder]}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>

        <Text style={styles.versionText}>KostIn v1.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.dark,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg - 2,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.extrabold,
    fontSize: typography.fontSize.xl,
    color: colors.surface,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.lg,
    color: colors.surface,
  },
  email: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  verifiedBadge: {
    alignSelf: "flex-start",
    marginTop: spacing.sm - 2,
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.xs,
    color: colors.accentBorder,
    backgroundColor: "rgba(255,90,95,0.15)",
    paddingVertical: 3,
    paddingHorizontal: spacing.sm + 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.lg,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md + 1,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuIcon: {
    fontSize: 19,
    width: 24,
    textAlign: "center",
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.base,
    color: colors.text,
  },
  menuDescription: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs + 0.5,
    color: colors.textLight,
    marginTop: 1,
  },
  logoutButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  logoutText: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm + 1.5,
    color: colors.error,
  },
  versionText: {
    textAlign: "center",
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
});

export default ProfilScreen;
