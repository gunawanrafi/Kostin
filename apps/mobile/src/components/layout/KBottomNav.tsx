import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { colors, spacing, typography } from "../../theme";

export type KBottomNavTabId = "beranda" | "cari" | "favorit" | "profil";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface TabDef {
  id: KBottomNavTabId;
  label: string;
  activeIcon: IoniconName;
  inactiveIcon: IoniconName;
}

const TABS: TabDef[] = [
  { id: "beranda", label: "Beranda", activeIcon: "home", inactiveIcon: "home-outline" },
  { id: "cari", label: "Cari", activeIcon: "search", inactiveIcon: "search-outline" },
  { id: "favorit", label: "Favorit", activeIcon: "heart", inactiveIcon: "heart-outline" },
  { id: "profil", label: "Profil", activeIcon: "person", inactiveIcon: "person-outline" },
];

export interface KBottomNavProps {
  active: KBottomNavTabId;
  onTabPress?: (id: KBottomNavTabId) => void;
  badges?: Partial<Record<KBottomNavTabId, number>>;
}

// Mirrors the prototype's ProtoTabBar: 60px height, 1px top border, 4px
// bottom padding (safe-area breathing room), 20px icon, 9.5px Inter label.
export function KBottomNav({ active, onTabPress, badges }: KBottomNavProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const badgeCount = badges?.[tab.id];
        return (
          <Pressable
            key={tab.id}
            onPress={() => onTabPress?.(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.6 : 1 }]}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.inactiveIcon}
                size={20}
                color={isActive ? colors.accent : colors.textLight}
              />
              {badgeCount ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.accent : colors.textLight, fontWeight: isActive ? typography.fontWeight.bold : typography.fontWeight.medium },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.xxs,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
  },
  label: {
    fontFamily: typography.fontFamily.body,
    fontSize: 9.5,
  },
});

export default KBottomNav;
