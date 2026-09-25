"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SetupNotice } from "@/components/shell/SetupNotice";
import { Button, Field, inputClass } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n/provider";
import { getSupabase } from "@/lib/supabase/client";
import { hasSupabase, isDemo } from "@/lib/supabase/env";
import { useSignedIn } from "@/lib/supabase/useSignedIn";

const BARS = [0.35, 0.7, 1, 0.55, 0.85, 0.4, 0.95, 0.6, 0.3, 0.75, 0.5, 0.9];
const COLORS = ["uv", "magenta", "cyan", "amber", "lime", "ice"];

export default function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const signedIn = useSignedIn();

  useEffect(() => {
    if (signedIn && hasSupabase) router.replace("/");
  }, [signedIn, router]);

  if (!hasSupabase && !isDemo) return <SetupNotice />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) return router.replace("/");
    setPending(true);
    setError(false);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) return setError(true);
    router.replace("/");
  };

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(1.25rem+var(--safe-top))]">
      <div className="flex justify-end">
        <button
          onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
          className="h-10 rounded-lg px-3 font-display text-sm font-semibold uppercase text-dim hover:text-ink"
          aria-label={t.common.language}
        >
          {locale === "ru" ? "EN" : "RU"}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="flex h-24 items-end gap-1.5" aria-hidden>
          {BARS.map((h, i) => (
            <motion.span
              key={i}
              className="flex-1 rounded-sm"
              style={{ background: `var(--color-${COLORS[i % COLORS.length]})`, transformOrigin: "bottom" }}
              initial={{ scaleY: 0.05, height: `${h * 100}%` }}
              animate={{ scaleY: [0.05, 1, h * 0.6, 1] }}
              transition={{ duration: 1.2, delay: i * 0.04, ease: [0.2, 0.9, 0.1, 1] }}
            />
          ))}
        </div>
        <h1 className="display-tight mt-6 text-6xl font-extrabold uppercase">Drop</h1>
        <p className="mt-2 text-dim">{t.login.subtitle}</p>

        <form onSubmit={submit} className="mt-8">
          <Field label={t.login.email}>
            <input
              className={inputClass}
              type="email"
              autoComplete="email"
              inputMode="email"
              required={!isDemo}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t.login.password}>
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              required={!isDemo}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <p role="alert" className="mt-1 text-sm text-red">
              {t.login.wrong}
            </p>
          )}
          <Button variant="primary" accent="var(--color-cyan)" className="mt-5 w-full" disabled={pending}>
            {t.login.submit}
          </Button>
        </form>
      </div>
    </div>
  );
}
