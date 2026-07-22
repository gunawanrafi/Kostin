import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { borderRadius, colors, spacing, typography } from "../../theme";

export type KListingCardVariant = "grid" | "row";

export interface KListingCardProps {
  /** Cover photo URL. Omitted/null renders the source prototype's striped "[ foto ]" placeholder. */
  photoUrl?: string | null | undefined;
  name: string;
  area: string;
  /** Full Rupiah amount (not thousands) — formatted here for both compact and full display. */
  pricePerMonth: number;
  rating: number;
  reviewCount?: number | undefined;
  /** e.g. "Putri" / "Putra" / "Campur" — already localized by the caller. */
  typeLabel: string;
  /** 0–100 AI match score; omit to hide the badge entirely. */
  matchScore?: number | undefined;
  /** Short promo ribbon, e.g. "Populer" (row variant only, mirrors KostRow's k.badge). */
  badge?: string | undefined;
  verified?: boolean | undefined;
  /** All rooms sold out — dims the photo with a "Penuh" overlay (row variant only). */
  full?: boolean | undefined;
  isFavorite?: boolean;
  onPress?: (() => void) | undefined;
  onToggleFavorite?: (() => void) | undefined;
  /** "grid" (default): vertical card for a 2-column grid. "row": wide list row. */
  variant?: KListingCardVariant;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// price is full Rupiah; "1.2jt" / "950rb" compact form mirrors the source
// prototype's KostCardH formatting.
function formatPriceCompact(price: number): string {
  if (price >= 1_000_000) {
    const millions = price / 1_000_000;
    return `${millions.toFixed(1).replace(".0", "")}jt`;
  }
  return `${Math.round(price / 1000)}rb`;
}

function formatPriceFull(price: number): string {
  return `Rp ${price.toLocaleString("id-ID")}`;
}

function Photo({ height, style }: { height: number; style?: StyleProp<ViewStyle> }): React.JSX.Element {
  return (
    <View style={[{ height, backgroundColor: colors.bg }, styles.photoPlaceholder, style]}>
      <Text style={styles.photoLabel}>[ foto ]</Text>
    </View>
  );
}

// Mirrors the source prototype's generic KListingCard (window.KListingCard in
// kostin-tokens.jsx), which KostCardH/KostRow specialize from — this RN port
// keeps that single component with a variant switch instead of splitting it.
export function KListingCard({
  photoUrl,
  name,
  area,
  pricePerMonth,
  rating,
  reviewCount,
  typeLabel,
  matchScore,
  badge,
  verified = false,
  full = false,
  isFavorite = false,
  onPress,
  onToggleFavorite,
  variant = "grid",
  style,
  testID,
}: KListingCardProps): React.JSX.Element {
  const isRow = variant === "row";
  const photoHeight = isRow ? 116 : 130;

  const photo = photoUrl ? (
    <Image source={{ uri: photoUrl }} style={{ height: photoHeight }} resizeMode="cover" />
  ) : (
    <Photo height={photoHeight} />
  );

  const favoriteButton = (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        onToggleFavorite?.();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? "Hapus dari favorit" : "Tambah ke favorit"}
      style={styles.favoriteButton}
    >
      <Ionicons
        name={isFavorite ? "heart" : "heart-outline"}
        size={isRow ? 18 : 15}
        color={isFavorite ? colors.accent : colors.textLight}
      />
    </Pressable>
  );

  if (isRow) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [styles.rowCard, { opacity: pressed ? 0.85 : 1 }, style]}
      >
        <View style={styles.rowPhotoWrap}>
          {photo}
          {badge ? (
            <View style={styles.rowRibbon}>
              <Text style={styles.rowRibbonText}>{badge}</Text>
            </View>
          ) : null}
          {full ? (
            <View style={styles.soldOverlay}>
              <Text style={styles.soldOverlayText}>Penuh</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowName} numberOfLines={2}>
              {name}
            </Text>
            {favoriteButton}
          </View>
          <Text style={styles.rowArea} numberOfLines={1}>
            {area}
          </Text>

          <View style={styles.rowChips}>
            <Text style={styles.neutralChip}>{typeLabel}</Text>
            <Text style={styles.neutralChip}>
              ★ {rating}
              {reviewCount ? ` (${reviewCount})` : ""}
            </Text>
            {verified ? <Text style={styles.verifiedChip}>✓ Terverifikasi</Text> : null}
          </View>

          <View style={styles.rowFooter}>
            {matchScore != null ? (
              <Text style={styles.matchChip}>{matchScore}% Cocok</Text>
            ) : (
              <View />
            )}
            <Text>
              <Text style={styles.rowPrice}>{formatPriceFull(pricePerMonth)}</Text>
              <Text style={styles.priceSuffix}>/bln</Text>
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.gridCard, { opacity: pressed ? 0.85 : 1 }, style]}
    >
      <View>
        {photo}
        {matchScore != null ? (
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{matchScore}% Cocok</Text>
          </View>
        ) : null}
        {favoriteButton}
      </View>

      <View style={styles.gridBody}>
        <Text style={styles.gridName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.gridArea} numberOfLines={1}>
          {area}
        </Text>

        <View style={styles.gridMetaRow}>
          <Text style={styles.neutralChip}>{typeLabel}</Text>
          <Text style={styles.gridRating}>
            ★ <Text style={styles.gridRatingValue}>{rating}</Text>
          </Text>
        </View>

        <Text style={styles.gridPriceRow}>
          <Text style={styles.gridPrice}>{formatPriceCompact(pricePerMonth)}</Text>
          <Text style={styles.priceSuffix}>/bln</Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  photoLabel: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  neutralChip: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textMid,
    backgroundColor: colors.bg,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
    overflow: "hidden",
  },
  priceSuffix: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
  },

  // ── grid variant ──
  gridCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  matchBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.accent,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  matchBadgeText: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.xs,
    color: colors.surface,
  },
  gridBody: {
    padding: spacing.sm + 1,
    gap: 4,
  },
  gridName: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm + 1,
    color: colors.text,
  },
  gridArea: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs + 0.5,
    color: colors.textLight,
  },
  gridMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  gridRating: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs + 1,
    color: colors.warning,
  },
  gridRatingValue: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  gridPriceRow: {
    marginTop: 2,
  },
  gridPrice: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.extrabold,
    fontSize: typography.fontSize.base,
    color: colors.accent,
  },

  // ── row variant ──
  rowCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  rowPhotoWrap: {
    width: 116,
    flexShrink: 0,
  },
  rowRibbon: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.warning,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 20,
  },
  rowRibbonText: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.bold,
    fontSize: 9,
    color: colors.surface,
  },
  soldOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  soldOverlayText: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
    color: colors.surface,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md - 1,
    gap: 3,
  },
  rowTitleLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  rowName: {
    flex: 1,
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm + 1.5,
    color: colors.text,
    lineHeight: (typography.fontSize.sm + 1.5) * typography.lineHeight.tight,
  },
  rowArea: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
  },
  rowChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
    marginBottom: 4,
  },
  verifiedChip: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.success,
    backgroundColor: colors.successSoft,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
    overflow: "hidden",
  },
  rowFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  matchChip: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.bold,
    fontSize: 9.5,
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  rowPrice: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.extrabold,
    fontSize: typography.fontSize.md - 1,
    color: colors.accent,
  },
});

export default KListingCard;
