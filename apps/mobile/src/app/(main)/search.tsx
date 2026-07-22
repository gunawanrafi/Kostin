import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SearchScreen } from "../../screens/main";
import { listingApi } from "../../lib/api";
import { toListingViewModel } from "../../lib/listing-mapper";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function SearchRoute(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const initialQuery = firstParam(params.q);

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce keystrokes before hitting GET /listings/search?q= — the backend
  // requires q.length >= 1, and there's no point re-searching on every key.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ["listings", "search", debouncedQuery],
    queryFn: () => listingApi.search(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });

  const listings = (searchQuery.data?.items ?? []).map(toListingViewModel);

  return (
    <SearchScreen
      onBack={() => router.back()}
      listings={listings}
      initialQuery={initialQuery}
      onQueryChange={setQuery}
      isSearching={searchQuery.isFetching}
      onOpenListing={(id) => router.push(`/listing/${id}`)}
    />
  );
}
