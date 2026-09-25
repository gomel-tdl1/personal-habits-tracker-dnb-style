import type { Metadata, Viewport } from "next";
import { Onest, Tektur } from "next/font/google";
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

// Static: the iOS app ships this as files, so the language is picked on the client.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${onest.variable} ${tektur.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
