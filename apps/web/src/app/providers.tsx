"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { Toaster, toast } from "@/components/ui/Toaster";
import { I18nProvider } from "@/lib/i18n/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } },
        mutationCache: new MutationCache({ onError: () => toast("saveError") }),
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster />
        </MotionConfig>
      </I18nProvider>
    </QueryClientProvider>
  );
}
