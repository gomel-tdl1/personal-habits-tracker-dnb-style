"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { Toaster, toast } from "@/components/ui/Toaster";
import type { Locale } from "@/lib/i18n/dict";
import { I18nProvider } from "@/lib/i18n/provider";

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } },
        mutationCache: new MutationCache({ onError: () => toast("saveError") }),
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <I18nProvider initial={locale}>
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster />
        </MotionConfig>
      </I18nProvider>
    </QueryClientProvider>
  );
}
