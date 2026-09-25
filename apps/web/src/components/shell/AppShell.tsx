"use client";

import { AudioWaveform, Disc3, LogOut, SlidersHorizontal, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useSoundEnabled } from "@/lib/sound/useSound";
import { getSupabase } from "@/lib/supabase/client";
import { hasSupabase, isDemo } from "@/lib/supabase/env";
import { useSignedIn } from "@/lib/supabase/useSignedIn";
import { SetupNotice } from "./SetupNotice";

const NAV = [
  { href: "/", key: "today", Icon: Disc3 },
  { href: "/dashboard", key: "dashboard", Icon: AudioWaveform },
  { href: "/trackers", key: "trackers", Icon: SlidersHorizontal },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const signedIn = useSignedIn();

  useEffect(() => {
    if (signedIn === false) router.replace("/login");
  }, [signedIn, router]);

  if (!hasSupabase && !isDemo) return <SetupNotice />;
  // Nothing to show until the session is known; the stage color fills the screen.
  if (!signedIn) return null;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-dvh md:pl-[5.5rem] lg:pl-60">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[5.5rem] flex-col border-r border-rig bg-stage/80 px-3 py-6 backdrop-blur-md md:flex lg:w-60 lg:px-4">
        <Logo />
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map(({ href, key, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`relative flex h-12 items-center justify-center gap-3 rounded-xl px-3 transition-colors lg:justify-start ${isActive(href) ? "text-ink" : "text-dim hover:text-ink"}`}
            >
              {isActive(href) && (
                <motion.span layoutId="rail-active" className="absolute inset-0 rounded-xl bg-panel-2" transition={{ type: "spring", damping: 30, stiffness: 400 }} />
              )}
              <Icon size={22} className="relative shrink-0" />
              <span className="relative hidden text-[15px] font-medium lg:inline">{t.nav[key]}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <Controls vertical />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-rig/60 bg-stage/80 px-4 pb-2 pt-[calc(0.5rem+var(--safe-top))] backdrop-blur-md md:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <Controls />
        </div>
      </header>

      {isDemo && (
        <p className="border-b border-amber/20 bg-amber/5 px-4 py-2 text-center text-xs text-amber/90">{t.common.demo}</p>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 pb-[calc(6.5rem+var(--safe-bottom))] pt-5 md:px-8 md:pb-12 md:pt-8">{children}</main>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-rig bg-stage/85 pb-[var(--safe-bottom)] backdrop-blur-lg md:hidden">
        <div className="mx-auto flex max-w-md">
          {NAV.map(({ href, key, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${active ? "text-ink" : "text-faint"}`}
              >
                {active && (
                  <motion.span
                    layoutId="tab-active"
                    className="absolute top-0 h-0.5 w-10 rounded-full bg-cyan shadow-[0_0_12px_var(--color-cyan)]"
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  />
                )}
                <Icon size={22} />
                {t.nav[key]}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1 lg:px-2" aria-label="Drop">
      <svg viewBox="0 0 24 24" className="size-7 shrink-0" aria-hidden>
        <g strokeLinecap="round" strokeWidth="2.6">
          <line x1="4" y1="15" x2="4" y2="19" stroke="var(--color-uv)" />
          <line x1="9.3" y1="9" x2="9.3" y2="19" stroke="var(--color-magenta)" />
          <line x1="14.6" y1="4" x2="14.6" y2="19" stroke="var(--color-cyan)" />
          <line x1="20" y1="11" x2="20" y2="19" stroke="var(--color-amber)" />
        </g>
      </svg>
      <span className="font-display text-xl font-bold tracking-tight md:hidden lg:inline">Drop</span>
    </Link>
  );
}

function Controls({ vertical = false }: { vertical?: boolean }) {
  const { t, locale, setLocale } = useI18n();
  const [soundOn, setSoundOn] = useSoundEnabled();
  const router = useRouter();

  const signOut = async () => {
    await getSupabase().auth.signOut();
    router.replace("/login");
  };

  const btn = `grid size-11 place-items-center rounded-xl text-dim transition-colors hover:bg-panel-2 hover:text-ink ${vertical ? "lg:flex lg:w-full lg:justify-start lg:gap-3 lg:px-3" : ""}`;
  const label = vertical ? "hidden text-sm lg:inline" : "sr-only";

  return (
    <>
      <button className={btn} onClick={() => setLocale(locale === "ru" ? "en" : "ru")} aria-label={t.common.language}>
        <span className="font-display text-sm font-semibold uppercase text-ink">{locale === "ru" ? "RU" : "EN"}</span>
        <span className={label}>{t.common.language}</span>
      </button>
      <button className={btn} onClick={() => setSoundOn(!soundOn)} aria-pressed={soundOn} aria-label={soundOn ? t.common.soundOn : t.common.soundOff}>
        {soundOn ? <Volume2 size={20} className="text-cyan" /> : <VolumeX size={20} />}
        <span className={label}>{soundOn ? t.common.soundOn : t.common.soundOff}</span>
      </button>
      {hasSupabase && (
        <button className={btn} onClick={signOut} aria-label={t.common.signOut}>
          <LogOut size={20} />
          <span className={label}>{t.common.signOut}</span>
        </button>
      )}
    </>
  );
}
