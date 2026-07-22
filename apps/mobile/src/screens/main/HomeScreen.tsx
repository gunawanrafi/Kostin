import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { KListingCard } from "../../components";
import { colors, spacing, typography } from "../../theme";
import type { Listing } from "./types";

const DEFAULT_CHIPS = ["Dekat UB", "Putri", "< Rp 1.5jt", "WiFi", "AC", "K. Mandi Dalam"];

export interface HomeScreenProps {
  userName: string;
  location?: string;
  listings: Listing[];
  filterChips?: string[];
  favoriteIds?: string[];
  onSearchPress: () => void;
  onChipPress?: (chip: string) => void;
  onNotificationsPress?: () => void;
  onOpenListing: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  /** Cursor-paginated GET /listings — called when the grid nears the end. */
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
}

// Beranda: dark greeting header, tap-to-search bar, quick filter chips, and
// a 2-column KListingCard grid with match-score badges.
export function HomeScreen({
  userName,
  location = "Malang, Jawa Timur",
  listings,
  filterChips = DEFAULT_CHIPS,
  favoriteIds = [],
  onSearchPress,
  onChipPress,
  onNotificationsPress,
  onOpenListing,
  onToggleFavorite,
  onEndReached,
  isFetchingNextPage = false,
}: HomeScreenProps): React.JSX.Element {
  const favoriteSet = new Set(favoriteIds);

  const renderItem: ListRenderItem<Listing> = ({ item }) => (
    <KListingCard
      variant="grid"
      name={item.name}
      area={item.area}
      photoUrl={item.photoUrl}
      pricePerMonth={item.pricePerMonth}
      rating={item.rating}
      reviewCount={item.reviewCount}
      typeLabel={item.typeLabel}
      matchScore={item.matchScore}
      isFavorite={favoriteSet.has(item.id)}
      onPress={() => onOpenListing(item.id)}
      onToggleFavorite={() => onToggleFavorite?.(item.id)}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.location}>📍 {location}</Text>
            <Text style={styles.greeting}>Halo, {userName}! 👋</Text>
          </View>
          <Pressable
            onPress={onNotificationsPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Notifikasi"
            style={styles.bellButton}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.surface} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        <Pressable onPress={onSearchPress} style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textLight} />
          <Text style={styles.searchPlaceholder}>Cari kost, area, atau kampus...</Text>
        </Pressable>
      </View>

      <FlatList
        style={styles.body}
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={renderItem}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator style={styles.footerLoader} color={colors.accent} /> : null
        }
        ListHeaderComponent={
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {filterChips.map((chip) => (
                <Pressable key={chip} onPress={() => onChipPress?.(chip)} style={styles.chip}>
                  <Text style={styles.chipText}>{chip}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Rekomendasi Untukmu</Text>
          </>
        }
      />
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md + 2,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  location: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: "rgba(255,255,255,0.5)",
  },
  greeting: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.lg,
    color: colors.surface,
    marginTop: 2,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.dark,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md + 1,
    paddingHorizontal: spacing.lg,
  },
  searchPlaceholder: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm + 1.5,
    color: colors.textLight,
  },
  body: {
    flex: 1,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg - 2,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
    color: colors.textSec,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  gridContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["2xl"],
  },
  gridRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  footerLoader: {
    marginVertical: spacing.lg,
  },
});

export default HomeScreen;
