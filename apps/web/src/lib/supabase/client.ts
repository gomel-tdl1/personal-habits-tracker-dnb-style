import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Preferences } from "@capacitor/preferences";
import { isNative } from "../native";
import { supabaseKey, supabaseUrl } from "./env";

let client: SupabaseClient | undefined;

/** The app's WebView has no cookies for its own scheme, so the session lives in native storage. */
const nativeStorage = {
  getItem: async (key: string) => (await Preferences.get({ key })).value,
  setItem: (key: string, value: string) => Preferences.set({ key, value }),
  removeItem: (key: string) => Preferences.remove({ key }),
};

export function getSupabase(): SupabaseClient {
  client ??= isNative
    ? createClient(supabaseUrl, supabaseKey, { auth: { storage: nativeStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
    : createBrowserClient(supabaseUrl, supabaseKey);
  return client;
}
