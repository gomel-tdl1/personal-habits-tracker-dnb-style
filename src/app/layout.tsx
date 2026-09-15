import type { Metadata, Viewport } from "next";
import { Onest, Tektur } from "next/font/google";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n/provider";
import { Providers } from "./providers";
import "./globals.css";

const onest = Onest({ variable: "--font-onest", subsets: ["latin", "cyrillic"] });
const tektur = Tektur({ variable: "--font-tektur", subsets: ["latin", "cyrillic"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: "Drop",
  description: "Habits on the beat",
  appleWebApp: { capable: true, title: "Drop", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#07081a",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value === "en" ? "en" : "ru";
  return (
    <html lang={locale} className={`${onest.variable} ${tektur.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
