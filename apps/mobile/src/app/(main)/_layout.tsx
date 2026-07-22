import React from "react";
import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { KBottomNav, type KBottomNavTabId } from "../../components";

// Route filename <-> KBottomNav's own tab-id vocabulary (Indonesian labels
// baked into the component). Keeping the mapping here means the route files
// can use the plain English names the task asked for (home/search/…).
const ROUTE_TO_TAB: Record<string, KBottomNavTabId> = {
  home: "beranda",
  search: "cari",
  favorit: "favorit",
  profil: "profil",
};
const TAB_TO_ROUTE: Record<KBottomNavTabId, string> = {
  beranda: "home",
  cari: "search",
  favorit: "favorit",
  profil: "profil",
};

// Adapts expo-router's Tabs (react-navigation bottom-tabs under the hood) to
// render KBottomNav instead of the default tab bar.
function CustomTabBar({ state, navigation }: BottomTabBarProps): React.JSX.Element {
  const currentRouteName = state.routes[state.index]?.name ?? "home";
  const active = ROUTE_TO_TAB[currentRouteName] ?? "beranda";

  return (
    <KBottomNav
      active={active}
      onTabPress={(tab) => {
        const routeName = TAB_TO_ROUTE[tab];
        navigation.navigate(routeName);
      }}
    />
  );
}

export default function MainTabsLayout(): React.JSX.Element {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="favorit" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
