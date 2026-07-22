import React from "react";
import { useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { HomeScreen } from "../../screens/main";
import { listingApi } from "../../lib/api";
import { toListingViewModel } from "../../lib/listing-mapper";
import { useAuthStore } from "../../store/authStore";

export default function HomeRoute(): React.JSX.Element {
  const router = useRouter();
  const userName = useAuthStore((s) => s.user?.name) ?? "Kamu";

  const listingsQuery = useInfiniteQuery({
    queryKey: ["listings", "home"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      listingApi.list({ cursor: pageParam, status: "ACTIVE", limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const listings = (listingsQuery.data?.pages ?? []).flatMap((page) => page.items.map(toListingViewModel));

  return (
    <HomeScreen
      userName={userName}
      listings={listings}
      onSearchPress={() => router.push("/(main)/search")}
      onChipPress={(chip) => router.push({ pathname: "/(main)/search", params: { q: chip } })}
      onOpenListing={(id) => router.push(`/listing/${id}`)}
      onEndReached={() => {
        if (listingsQuery.hasNextPage && !listingsQuery.isFetchingNextPage) {
          void listingsQuery.fetchNextPage();
        }
      }}
      isFetchingNextPage={listingsQuery.isFetchingNextPage}
    />
  );
}
