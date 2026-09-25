import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gomeltdl1.drop",
  appName: "Drop",
  // Static build of apps/web: `pnpm build:web` writes it with DROP_TARGET=mobile.
  webDir: "../web/out",
  backgroundColor: "#07081a",
  ios: {
    // Pages draw under the status bar and home indicator and pad themselves with safe-area insets.
    contentInset: "never",
    backgroundColor: "#07081a",
    scrollEnabled: true,
  },
  plugins: {
    StatusBar: { style: "DARK", overlaysWebView: true },
  },
};

export default config;
