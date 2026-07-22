import React from "react";
import { Redirect } from "expo-router";

// Entry point — always lands on the splash screen first; the splash route
// itself decides (once the auth store has rehydrated) whether to continue
// into onboarding/role/login or straight to (main)/home for a returning,
// already-authenticated user.
export default function Index(): React.JSX.Element {
  return <Redirect href="/(auth)/splash" />;
}
