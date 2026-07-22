import React, { useRef, useState } from "react";
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { KButton } from "../../components";
import { colors, spacing, typography } from "../../theme";
import type { Listing } from "./types";

export interface ListingDetailScreenProps {
  listing: Listing;
  isFavorite?: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
  onContact: () => void;
  onBook: () => void;
  onShare?: () => void;
}

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// Foto gallery (swipe), info, fasilitas, map placeholder, info pemilik, and
// a 3-action sticky footer (Simpan / Hubungi / Pesan).
export function ListingDetailScreen({
  listing,
  isFavorite = false,
  onBack,
  onToggleFavorite,
  onContact,
  onBook,
  onShare,
}: ListingDetailScreenProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const [photoIndex, setPhotoIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const photos = listing.photos?.length ? listing.photos : listing.photoUrl ? [listing.photoUrl] : [];
  const gallerySlots = photos.length || 1;

  const handleGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== photoIndex) setPhotoIndex(next);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.galleryWrap}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleGalleryScroll}
          >
            {Array.from({ length: gallerySlots }).map((_, i) =>
              photos[i] ? (
                <Image key={i} source={{ uri: photos[i] }} style={{ width, height: 280 }} resizeMode="cover" />
              ) : (
                <View key={i} style={[styles.photoPlaceholder, { width }]}>
                  <Text style={styles.photoPlaceholderText}>
                    [ foto {i + 1}/{gallerySlots} ]
                  </Text>
                </View>
              ),
            )}
          </ScrollView>

          <View style={styles.galleryTopBar}>
            <Pressable onPress={onBack} style={styles.circleButton}>
              <Ionicons name="chevron-back" size={22} color={colors.surface} />
            </Pressable>
            <View style={styles.galleryTopRight}>
              <Pressable onPress={onShare} style={styles.circleButton}>
                <Ionicons name="share-outline" size={17} color={colors.surface} />
              </Pressable>
              <Pressable onPress={onToggleFavorite} style={styles.circleButton}>
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={19}
                  color={isFavorite ? colors.accent : colors.surface}
                />
              </Pressable>
            </View>
          </View>

          {gallerySlots > 1 ? (
            <View style={styles.galleryDots}>
              {Array.from({ length: gallerySlots }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.galleryDot,
                    { backgroundColor: i === photoIndex ? colors.surface : "rgba(255,255,255,0.4)" },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.name}>{listing.name}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>★ {listing.rating}</Text>
            {listing.reviewCount ? (
              <Text style={styles.metaText}>({listing.reviewCount} ulasan)</Text>
            ) : null}
            <Text style={styles.dot}>·</Text>
            <Text style={styles.metaText}>{listing.area}</Text>
          </View>
          <View style={styles.badgeRow}>
            <Text style={styles.neutralBadge}>{listing.typeLabel}</Text>
            {listing.verified ? <Text style={styles.verifiedBadge}>✓ Terverifikasi</Text> : null}
            {listing.matchScore != null ? (
              <Text style={styles.matchBadge}>{listing.matchScore}% Cocok</Text>
            ) : null}
          </View>
        </View>

        {listing.matchScore != null ? (
          <View style={styles.matchPanel}>
            <Text style={styles.matchPanelLabel}>🎯 SKOR KECOCOKAN</Text>
            <View style={styles.matchPanelRow}>
              <View style={styles.matchTrack}>
                <View style={[styles.matchFill, { width: `${listing.matchScore}%` }]} />
              </View>
              <Text style={styles.matchPanelValue}>{listing.matchScore}%</Text>
            </View>
            <Text style={styles.matchPanelHint}>
              Cocok dari sisi jarak ke kampus, budget, dan fasilitas yang kamu cari.
            </Text>
          </View>
        ) : null}

        {listing.facilities?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fasilitas</Text>
            <View style={styles.facilitiesGrid}>
              {listing.facilities.map((facility, i) => (
                <View key={i} style={styles.facilityItem}>
                  <Ionicons name="checkmark" size={14} color={colors.success} />
                  <Text style={styles.facilityText}>{facility}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {listing.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deskripsi</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lokasi</Text>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="location" size={22} color={colors.textMid} />
            <Text style={styles.mapPlaceholderText}>Peta lokasi (segera hadir)</Text>
          </View>
        </View>

        {listing.owner ? (
          <View style={styles.ownerCard}>
            <View style={styles.ownerAvatar}>
              <Ionicons name="person" size={20} color={colors.textMid} />
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{listing.owner.name}</Text>
              <Text style={styles.ownerMeta}>
                Pemilik{listing.owner.responseTime ? ` · Biasa balas < ${listing.owner.responseTime}` : ""}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceLabel}>Mulai dari</Text>
          <Text>
            <Text style={styles.footerPriceValue}>{formatRupiah(listing.pricePerMonth)}</Text>
            <Text style={styles.footerPriceSuffix}>/bln</Text>
          </Text>
        </View>
        <KButton label="Simpan" variant="outline" size="sm" onPress={onToggleFavorite} />
        <KButton label="Hubungi" variant="outline" size="sm" onPress={onContact} />
        <KButton label="Pesan" variant="primary" size="md" onPress={onBook} style={styles.bookButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: spacing["3xl"],
  },
  galleryWrap: {
    position: "relative",
  },
  photoPlaceholder: {
    height: 280,
    backgroundColor: "#DEDEE2",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.xs,
    color: colors.textMid,
  },
  galleryTopBar: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  galleryTopRight: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryDots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  galleryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  infoSection: {
    padding: spacing.xl,
  },
  name: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.extrabold,
    fontSize: typography.fontSize.xl + 1,
    color: colors.text,
    lineHeight: (typography.fontSize.xl + 1) * typography.lineHeight.tight,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: "wrap",
  },
  ratingText: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm + 0.5,
    color: colors.warning,
  },
  metaText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textMid,
  },
  dot: {
    color: colors.border,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: "wrap",
  },
  neutralBadge: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm - 1,
    color: colors.textSec,
    backgroundColor: colors.bg,
    paddingVertical: 5,
    paddingHorizontal: spacing.md - 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  verifiedBadge: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm - 1,
    color: colors.success,
    backgroundColor: colors.successSoft,
    paddingVertical: 5,
    paddingHorizontal: spacing.md - 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  matchBadge: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm - 1,
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingVertical: 5,
    paddingHorizontal: spacing.md - 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  matchPanel: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    backgroundColor: colors.dark,
    borderRadius: 14,
    padding: spacing.lg,
  },
  matchPanelLabel: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.xs + 0.5,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
  },
  matchPanelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  matchTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  matchFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  matchPanelValue: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.extrabold,
    fontSize: typography.fontSize.lg,
    color: colors.surface,
  },
  matchPanelHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm - 0.5,
    color: "rgba(255,255,255,0.6)",
    marginTop: spacing.sm,
    lineHeight: (typography.fontSize.sm - 0.5) * typography.lineHeight.relaxed,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  facilitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  facilityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm - 1,
    width: "50%",
    marginBottom: spacing.md,
  },
  facilityText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm + 0.5,
    color: colors.textSec,
  },
  description: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textMid,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  mapPlaceholder: {
    height: 140,
    borderRadius: 14,
    backgroundColor: colors.mapBg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  mapPlaceholderText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textMid,
  },
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg - 2,
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm + 1.5,
    color: colors.text,
  },
  ownerMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm - 1,
    color: colors.textMid,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerPrice: {
    marginRight: spacing.xs,
  },
  footerPriceLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
  },
  footerPriceValue: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.extrabold,
    fontSize: typography.fontSize.md + 1,
    color: colors.accent,
  },
  footerPriceSuffix: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
  },
  bookButton: {
    flex: 1,
  },
});

export default ListingDetailScreen;
