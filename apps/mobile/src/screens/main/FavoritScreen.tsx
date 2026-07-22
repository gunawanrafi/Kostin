import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { KButton, KListingCard, KTopBar } from "../../components";
import { colors, spacing, typography } from "../../theme";
import type { Listing } from "./types";

export interface FavoritScreenProps {
  favorites: Listing[];
  onOpenListing: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onBrowsePress: () => void;
}

// Favorit tab: 2-column grid of saved listings, or an empty state prompting
// the user back into search — mirrors the source prototype's FavoritScreen.
export function FavoritScreen({
  favorites,
  onOpenListing,
  onToggleFavorite,
  onBrowsePress,
}: FavoritScreenProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KTopBar title="Favorit Saya" />

      {favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>♡</Text>
          <Text style={styles.emptyTitle}>Belum ada favorit</Text>
          <Text style={styles.emptySubtitle}>
            Tap ikon hati pada kost yang kamu suka untuk menyimpannya di sini.
          </Text>
          <KButton
            label="Cari Kost"
            variant="primary"
            size="md"
            onPress={onBrowsePress}
            style={styles.browseButton}
          />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          ListHeaderComponent={
            <Text style={styles.countLabel}>{favorites.length} kost tersimpan</Text>
          }
          renderItem={({ item }) => (
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
              isFavorite
              onPress={() => onOpenListing(item.id)}
              onToggleFavorite={() => onToggleFavorite(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
  },
  emptyEmoji: {
    fontSize: 48,
    color: colors.textMid,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.lg - 1,
    color: colors.text,
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textMid,
    marginTop: spacing.sm + 1,
    textAlign: "center",
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  browseButton: {
    marginTop: spacing.xl,
  },
  countLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm + 0.5,
    color: colors.textMid,
    marginBottom: spacing.md,
  },
  gridContent: {
    padding: spacing.lg,
  },
  gridRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
});

export default FavoritScreen;
