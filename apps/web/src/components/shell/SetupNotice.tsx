"use client";

import { useI18n } from "@/lib/i18n/provider";

export function SetupNotice() {
  const { t } = useI18n();
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md">
        <h1 className="font-display text-3xl font-bold">{t.login.setupTitle}</h1>
        <p className="mt-3 leading-relaxed text-dim">{t.login.setupText}</p>
      </div>
    </div>
  );
}
