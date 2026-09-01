import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.langapp.lang",
  appName: "Lang",
  // scripts/build-capacitor.sh runs `next build` with CAPACITOR_BUILD=1
  // first, which writes the static export here.
  webDir: "out",
};

export default config;
