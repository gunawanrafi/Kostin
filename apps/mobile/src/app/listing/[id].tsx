import React from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ListingDetailScreen } from "../../screens/main";
import { KButton } from "../../components";
import { listingApi } from "../../lib/api";
import { toListingViewModel } from "../../lib/listing-mapper";
import { colors, spacing, typography } from "../../theme";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function ListingDetailRoute(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const listingId = firstParam(params.id);

  const detailQuery = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => listingApi.getById(listingId!),
    enabled: Boolean(listingId),
  });

  if (detailQuery.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (detailQuery.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Kost tidak ditemukan.</Text>
        <KButton label="Kembali" variant="outline" onPress={() => router.back()} style={styles.backButton} />
      </View>
    );
  }

  return (
    <ListingDetailScreen
      listing={toListingViewModel(detailQuery.data)}
      onBack={() => router.back()}
      onToggleFavorite={() =>
        Alert.alert("Segera hadir", "Favorit belum didukung oleh backend.")
      }
      onContact={() => Alert.alert("Segera hadir", "Chat dengan pemilik belum tersedia.")}
      onBook={() => Alert.alert("Segera hadir", "Alur booking belum tersedia di layar ini.")}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    gap: spacing.lg,
    padding: spacing["2xl"],
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textMid,
  },
  backButton: {
    minWidth: 160,
  },
});
