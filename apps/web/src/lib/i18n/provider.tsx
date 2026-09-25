"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { getSupabase } from "../supabase/client";
import { hasSupabase } from "../supabase/env";
import { dictionaries, type Dict, type Locale } from "@drop/core/i18n/dict";

interface I18n {
  locale: Locale;
  t: Dict;
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<I18n | null>(null);

const KEY = "locale";

function isLocale(v: unknown): v is Locale {
  return v === "ru" || v === "en";
}

/** Saved choice; the cookie is where earlier versions kept it. */
function readSaved(): Locale | null {
  try {
    const stored = localStorage.getItem(KEY);
    if (isLocale(stored)) return stored;
  } catch {}
  const cookie = /(?:^|; )locale=(\w+)/.exec(document.cookie)?.[1];
  return isLocale(cookie) ? cookie : null;
}

/*
 * The language lives outside React: pages are prerendered in Russian (the iOS app
 * ships them as static files), then hydrate and switch to the saved language.
 */
let current: Locale | undefined;
const listeners = new Set<() => void>();

const store = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: (): Locale => (current ??= readSaved() ?? "ru"),
  set(l: Locale) {
    current = l;
    try {
      localStorage.setItem(KEY, l);
    } catch {}
    document.documentElement.lang = l;
    listeners.forEach((fn) => fn());
  },
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(store.subscribe, store.get, () => "ru" as Locale);

  const setLocale = useCallback((l: Locale) => {
    store.set(l);
    if (hasSupabase) void getSupabase().auth.updateUser({ data: { locale: l } });
  }, []);

  // Pick up the language chosen on another device.
  useEffect(() => {
    document.documentElement.lang = store.get();
    if (!hasSupabase) return;
    void getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        const remote = data.session?.user.user_metadata?.locale;
        if (isLocale(remote) && remote !== store.get()) store.set(remote);
      });
  }, []);

  const value = useMemo(() => ({ locale, t: dictionaries[locale], setLocale }), [locale, setLocale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
