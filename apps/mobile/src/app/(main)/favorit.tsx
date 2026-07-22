import React from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FavoritScreen } from "../../screens/main";
import { userApi } from "../../lib/api";
import { toListingViewModel } from "../../lib/listing-mapper";

export default function FavoritRoute(): React.JSX.Element {
  const router = useRouter();

  // NOTE: GET /users/me/favorites doesn't exist on user-service yet (no
  // Favorite model or route there) — wired per spec, but this will error
  // until that backend work lands. React Query just surfaces an empty list
  // meanwhile (`data ?? []`), so the empty-state UI covers it gracefully.
  const favoritesQuery = useQuery({
    queryKey: ["favorites"],
    queryFn: userApi.getFavorites,
    retry: false,
  });

  const favorites = (favoritesQuery.data ?? []).map(toListingViewModel);

  return (
    <FavoritScreen
      favorites={favorites}
      onOpenListing={(id) => router.push(`/listing/${id}`)}
      onToggleFavorite={() =>
        Alert.alert("Segera hadir", "Menghapus favorit belum didukung oleh backend.")
      }
      onBrowsePress={() => router.push("/(main)/search")}
    />
  );
}
