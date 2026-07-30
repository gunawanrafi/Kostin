// Metro config for a workspace inside the KostIn npm-workspaces monorepo.
// Without this, Metro only watches `apps/mobile` and cannot read the hoisted
// dependencies (expo, expo-router, react-native, react-native-web, @kostin/*)
// that npm installs into the repo-root `node_modules`.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo so hoisted packages and the local `@kostin/types`
//    workspace are inside the file map Metro is allowed to read from.
config.watchFolders = [monorepoRoot];

// 2. Resolve from this app first, then the hoisted root store.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Resolve only from the two paths above instead of walking every parent
//    directory — keeps a duplicate react/react-native higher up the tree from
//    being picked up (two React copies = invalid hook calls).
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
