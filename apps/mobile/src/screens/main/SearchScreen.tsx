import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { KButton, KListingCard } from "../../components";
import { colors, spacing, typography } from "../../theme";
import type { Listing } from "./types";

const TYPE_OPTIONS = ["Semua", "Putri", "Putra", "Campur"];
const FACILITY_OPTIONS = ["WiFi", "AC", "K. Mandi Dalam", "Parkir", "Dapur", "Laundry", "CCTV", "Gym"];
const DISTANCE_OPTIONS = ["Semua", "< 500m", "< 1km", "< 2km", "< 5km"];
const DISTANCE_MAX_KM: Record<string, number | undefined> = {
  "Semua": undefined,
  "< 500m": 0.5,
  "< 1km": 1,
  "< 2km": 2,
  "< 5km": 5,
};
const SORT_OPTIONS: { id: "match" | "price" | "rating"; label: string }[] = [
  { id: "match", label: "Paling Cocok" },
  { id: "price", label: "Harga Terendah" },
  { id: "rating", label: "Rating Tertinggi" },
];

export interface SearchFilters {
  typeLabel: string;
  minPrice: string;
  maxPrice: string;
  facilities: string[];
  distanceLabel: string;
}

const EMPTY_FILTERS: SearchFilters = {
  typeLabel: "Semua",
  minPrice: "",
  maxPrice: "",
  facilities: [],
  distanceLabel: "Semua",
};

function activeFilterCount(f: SearchFilters): number {
  return (
    (f.typeLabel !== "Semua" ? 1 : 0) +
    (f.minPrice ? 1 : 0) +
    (f.maxPrice ? 1 : 0) +
    (f.distanceLabel !== "Semua" ? 1 : 0) +
    f.facilities.length
  );
}

export interface SearchScreenProps {
  onBack: () => void;
  listings: Listing[];
  initialQuery?: string;
  favoriteIds?: string[];
  onOpenListing: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  /** Notified on every keystroke so a parent can debounce a server-side
   * GET /listings/search?q= — the facet filters/sort below still run
   * client-side on top of whatever `listings` the parent passes back. */
  onQueryChange?: (query: string) => void;
  isSearching?: boolean;
}

// Full search: text query + sort sheet + a filter modal (tipe kost, harga
// min/max, fasilitas, jarak). Facet filtering/sorting is self-contained here;
// the text query itself is forwarded to the parent via onQueryChange so it
// can hit the real search API (see (main)/search.tsx).
export function SearchScreen({
  onBack,
  listings,
  initialQuery = "",
  favoriteIds = [],
  onOpenListing,
  onToggleFavorite,
  onQueryChange,
  isSearching = false,
}: SearchScreenProps): React.JSX.Element {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<"match" | "price" | "rating">("match");
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(EMPTY_FILTERS);

  const favoriteSet = new Set(favoriteIds);
  const sortLabel = SORT_OPTIONS.find((s) => s.id === sort)?.label ?? "";
  const filterCount = activeFilterCount(appliedFilters);

  const results = useMemo(() => {
    const min = appliedFilters.minPrice ? Number(appliedFilters.minPrice) * 1000 : undefined;
    const max = appliedFilters.maxPrice ? Number(appliedFilters.maxPrice) * 1000 : undefined;
    const maxKm = DISTANCE_MAX_KM[appliedFilters.distanceLabel];

    let list = listings.filter((k) => {
      if (query && !`${k.name}${k.area}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (appliedFilters.typeLabel !== "Semua" && k.typeLabel !== appliedFilters.typeLabel) return false;
      if (min != null && k.pricePerMonth < min) return false;
      if (max != null && k.pricePerMonth > max) return false;
      if (maxKm != null && k.distanceKm != null && k.distanceKm > maxKm) return false;
      if (
        appliedFilters.facilities.length &&
        !appliedFilters.facilities.every((f) => (k.facilities ?? []).some((kf) => kf.includes(f)))
      ) {
        return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === "price") return a.pricePerMonth - b.pricePerMonth;
      if (sort === "rating") return b.rating - a.rating;
      return (b.matchScore ?? 0) - (a.matchScore ?? 0);
    });

    return list;
  }, [listings, query, appliedFilters, sort]);

  const openFilterModal = (): void => {
    setDraftFilters(appliedFilters);
    setFilterModalVisible(true);
  };

  const toggleDraftFacility = (facility: string): void => {
    setDraftFilters((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.searchHeader}>
        <View style={styles.searchRow}>
          <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.searchInputWrap}>
            <TextInput
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                onQueryChange?.(text);
              }}
              placeholder="Cari kost, area, kampus..."
              placeholderTextColor={colors.textLight}
              style={styles.searchInput}
              autoFocus
            />
          </View>
        </View>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.resultCount}>
          {isSearching ? (
            "Mencari..."
          ) : (
            <>
              <Text style={styles.resultCountStrong}>{results.length}</Text> kost ditemukan
            </>
          )}
        </Text>
        <View style={styles.toolbarActions}>
          <Pressable onPress={() => setSortSheetVisible(true)} style={styles.toolbarButton}>
            <Text style={styles.toolbarButtonText}>↕ {sortLabel}</Text>
          </Pressable>
          <Pressable onPress={openFilterModal} style={styles.toolbarButton}>
            <Text style={styles.toolbarButtonText}>
              ⚙ Filter{filterCount ? ` (${filterCount})` : ""}
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>Tidak ada hasil</Text>
            <Text style={styles.emptySubtitle}>Coba ubah kata kunci atau filter.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <KListingCard
            variant="row"
            name={item.name}
            area={item.area}
            photoUrl={item.photoUrl}
            pricePerMonth={item.pricePerMonth}
            rating={item.rating}
            reviewCount={item.reviewCount}
            typeLabel={item.typeLabel}
            matchScore={item.matchScore}
            verified={item.verified}
            badge={item.badge}
            full={item.full}
            isFavorite={favoriteSet.has(item.id)}
            onPress={() => onOpenListing(item.id)}
            onToggleFavorite={() => onToggleFavorite?.(item.id)}
          />
        )}
      />

      {/* Sort bottom sheet */}
      <Modal
        visible={sortSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortSheetVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSortSheetVisible(false)} />
        <View style={styles.sortSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Urutkan</Text>
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => {
                setSort(opt.id);
                setSortSheetVisible(false);
              }}
              style={styles.sortRow}
            >
              <Text style={[styles.sortRowText, sort === opt.id && styles.sortRowTextActive]}>
                {opt.label}
              </Text>
              {sort === opt.id ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
            </Pressable>
          ))}
        </View>
      </Modal>

      {/* Filter modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.filterModal}>
          <View style={styles.filterHeader}>
            <Pressable onPress={() => setFilterModalVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.filterHeaderTitle}>Filter</Text>
            <Pressable onPress={() => setDraftFilters(EMPTY_FILTERS)} hitSlop={8}>
              <Text style={styles.filterReset}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.filterBody}>
            <View>
              <Text style={styles.filterLabel}>Tipe Kost</Text>
              <View style={styles.segmentedRow}>
                {TYPE_OPTIONS.map((opt) => {
                  const active = draftFilters.typeLabel === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setDraftFilters((p) => ({ ...p, typeLabel: opt }))}
                      style={[styles.segment, active && styles.segmentActive]}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={styles.filterLabel}>Harga per Bulan (ribuan Rp)</Text>
              <View style={styles.priceRow}>
                <TextInput
                  value={draftFilters.minPrice}
                  onChangeText={(v) => setDraftFilters((p) => ({ ...p, minPrice: v.replace(/\D/g, "") }))}
                  placeholder="Min"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                  style={styles.priceInput}
                />
                <Text style={styles.priceDash}>—</Text>
                <TextInput
                  value={draftFilters.maxPrice}
                  onChangeText={(v) => setDraftFilters((p) => ({ ...p, maxPrice: v.replace(/\D/g, "") }))}
                  placeholder="Maks"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                  style={styles.priceInput}
                />
              </View>
            </View>

            <View>
              <Text style={styles.filterLabel}>Jarak dari Kampus</Text>
              <View style={styles.chipsWrap}>
                {DISTANCE_OPTIONS.map((opt) => {
                  const active = draftFilters.distanceLabel === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setDraftFilters((p) => ({ ...p, distanceLabel: opt }))}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={styles.filterLabel}>Fasilitas</Text>
              <View style={styles.chipsWrap}>
                {FACILITY_OPTIONS.map((opt) => {
                  const active = draftFilters.facilities.includes(opt);
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => toggleDraftFacility(opt)}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {active ? "✓ " : ""}
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterFooter}>
            <KButton
              label="Terapkan Filter"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => {
                setAppliedFilters(draftFilters);
                setFilterModalVisible(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  backButton: {
    padding: 6,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.lg - 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.text,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultCount: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm + 0.5,
    color: colors.textMid,
  },
  resultCountStrong: {
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  toolbarActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  toolbarButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md - 1,
  },
  toolbarButtonText: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
    color: colors.textSec,
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing["6xl"],
    paddingHorizontal: spacing["2xl"],
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textMid,
    marginTop: spacing.sm - 2,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sortSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing["2xl"],
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginVertical: spacing.sm + 2,
  },
  sheetTitle: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
  },
  sortRowText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.text,
  },
  sortRowTextActive: {
    fontWeight: typography.fontWeight.bold,
  },
  filterModal: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  filterHeader: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterHeaderTitle: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  filterReset: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm + 1,
    color: colors.accent,
  },
  filterBody: {
    padding: spacing.xl,
    gap: spacing["2xl"] + 2,
  },
  filterLabel: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm + 2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.md - 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  segmentActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  segmentText: {
    fontFamily: typography.fontFamily.body,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm + 0.5,
    color: colors.textMid,
  },
  segmentTextActive: {
    color: colors.accent,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.text,
  },
  priceDash: {
    color: colors.textLight,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm + 1,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg - 1,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  filterChipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm + 0.5,
    color: colors.textMid,
  },
  filterChipTextActive: {
    color: colors.accent,
    fontWeight: typography.fontWeight.semibold,
  },
  filterFooter: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default SearchScreen;
