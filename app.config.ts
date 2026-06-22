import appJson from './app.json';
import type { ExpoConfig } from 'expo/config';

// Layer the static app.json with the Supabase env so the URL + anon key are
// available at runtime via Constants.expoConfig.extra (fallback for when the
// EXPO_PUBLIC_* inlined vars are not present). The anon key is public by design;
// data is protected by Supabase Row-Level Security, not by hiding this key.
const config: ExpoConfig = {
  ...(appJson.expo as ExpoConfig),
  extra: {
    ...((appJson.expo as ExpoConfig).extra ?? {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default config;
