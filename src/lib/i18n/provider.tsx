"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase } from "../supabase/client";
import { hasSupabase } from "../supabase/env";
import { dictionaries, type Dict, type Locale } from "./dict";

interface I18n {
  locale: Locale;
  t: Dict;
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<I18n | null>(null);

export const LOCALE_COOKIE = "locale";

function writeCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  const apply = useCallback((l: Locale) => {
    setLocaleState(l);
    writeCookie(l);
    document.documentElement.lang = l;
  }, []);

  const setLocale = useCallback(
    (l: Locale) => {
      apply(l);
      if (hasSupabase) void getSupabase().auth.updateUser({ data: { locale: l } });
    },
    [apply],
  );

  // Pick up the language chosen on another device.
  useEffect(() => {
    if (!hasSupabase) return;
    void getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        const remote = data.session?.user.user_metadata?.locale;
        if ((remote === "ru" || remote === "en") && remote !== initial) apply(remote);
      });
  }, [apply, initial]);

  const value = useMemo(() => ({ locale, t: dictionaries[locale], setLocale }), [locale, setLocale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
