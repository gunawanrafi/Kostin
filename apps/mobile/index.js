// Local entry point — do not replace with `"main": "expo-router/entry"`.
//
// In this monorepo, `expo-router` is hoisted to the root `node_modules`, which
// sits OUTSIDE Metro's project root (`apps/mobile`). Expo builds the web
// script URL as `path.relative(projectRoot, resolvedEntry)`, so pointing
// `main` straight at `expo-router/entry` produced:
//
//     <script src="/../../node_modules/expo-router/entry.bundle?platform=web">
//
// The browser normalises that above the server root to
// `/node_modules/expo-router/entry.bundle`, which Metro answers with a 404 and
// a JSON error body — hence "Refused to execute script because MIME type
// application/json is not executable" and a blank screen.
//
// Re-exporting the router entry from a file inside the project root keeps the
// URL as `/index.bundle`, which Metro can actually serve. `expo-router/entry`
// imports `@expo/metro-runtime` first (web Fast Refresh) and then registers the
// root component, so this must stay the only import in this file.
import "expo-router/entry";
