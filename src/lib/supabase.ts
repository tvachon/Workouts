import 'react-native-url-polyfill/auto'; // supabase-js needs the URL polyfill on Hermes (native)
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

// EXPO_PUBLIC_* vars are inlined into the bundle at build time; app.config.ts
// also mirrors them into `extra` as a fallback.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  // Don't crash the bundle — surface a clear hint instead so the app still loads.
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local and fill in your Supabase project values.',
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    // AsyncStorage persists the session: native device store on iOS/Android,
    // a localStorage-backed shim on web.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Only relevant if magic-link / OAuth is added later (web parses the URL).
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/** Current authenticated user id, read from the locally cached session. */
export async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('You must be signed in to do that.');
  return id;
}
