import type { CapacitorConfig } from '@capacitor/cli';

// Android wrapper around the web app. Build the web side first: `bun/deno run vite build --mode android` (see scripts/build-android.sh).
const config: CapacitorConfig = {
  appId: 'org.trafficarchive.app',
  appName: 'Traffic Archive',
  webDir: 'dist-android',
  server: { androidScheme: 'https' },
};
export default config;
