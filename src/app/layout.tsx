import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import type { ReactNode } from "react";
import { ErrorReporter } from "@/components/error-reporter";
import { SiteMonitoring } from "@/components/site-monitoring";
import { valentine } from "@/content/valentine";
import "@/styles/valentine.css";

// Self-hosted at build time. `subsets` only chooses what is preloaded: the Vietnamese faces are still
// declared, so an edit to Vietnamese copy loads them on demand without preloading them for English.
// The SOFT and optical-size axes give the name its soft display cut; they are most of the font's weight.
const display = Fraunces({
  subsets: ["latin"],
  style: ["italic"],
  axes: ["SOFT", "opsz"],
  variable: "--font-display",
  display: "swap",
});
const sans = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
  display: "swap",
});

// Share previews need absolute URLs. Pinned to the canonical domain: Vercel's production-domain variable
// can name the shorter automatic domain, which only redirects here. Previews point at it too.
const site = process.env.VERCEL ? "https://happy-valentine-from-perceval.vercel.app" : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: valentine.tabTitle,
  description: valentine.share.description,
  // A personal page: keep it out of search engines.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  openGraph: {
    title: valentine.share.title,
    description: valentine.share.description,
    type: "website",
    locale: valentine.locale,
  },
  twitter: { card: "summary_large_image", title: valentine.share.title, description: valentine.share.description },
};

export const viewport: Viewport = { themeColor: "#06020b", colorScheme: "dark", viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={valentine.lang} className={`${display.variable} ${sans.variable}`}>
      <body>
        {children}
        <ErrorReporter />
        <SiteMonitoring enabled={process.env.VERCEL_ENV === "production" && process.env.NODE_ENV === "production"} />
      </body>
    </html>
  );
}
