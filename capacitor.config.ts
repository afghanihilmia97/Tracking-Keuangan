/// <reference types="@capacitor-firebase/authentication" />

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.financetrack.harian",
  appName: "FinanceTrack",
  webDir: "dist/client",
  server: {
    androidScheme: "https"
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ["google.com"]
    }
  }
};

export default config;
