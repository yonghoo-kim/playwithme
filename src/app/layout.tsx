import type { Metadata } from "next";
import { Jua } from "next/font/google";
import "./globals.css";
import NavigationProgress from "./NavigationProgress";
import PlaygroundBackground from "@/components/PlaygroundBackground";
import PushOpenListener from "@/components/PushOpenListener";
import InstallGuide from "@/components/InstallGuide";
import { DAY_PHASE_SCRIPT } from "@/lib/dayPhase";
import { WEATHER_CACHE_SCRIPT } from "@/lib/weatherCache";
import { SKY_CHROME_SCRIPT } from "@/lib/skyChrome";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_URL } from "@/lib/inviteMetadata";

const jua = Jua({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-jua",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "나랑 놀자",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "나랑 놀자",
    description: SITE_DESCRIPTION,
    siteName: "나랑 놀자",
    locale: "ko_KR",
    type: "website",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-phase / data-weather are set by the inline scripts before hydration.
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#9DDCFF" />
        <script dangerouslySetInnerHTML={{ __html: DAY_PHASE_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: WEATHER_CACHE_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SKY_CHROME_SCRIPT }} />
      </head>
      <body className={`${jua.variable} font-jua bg-transparent antialiased`}>
        <PlaygroundBackground />
        <NavigationProgress />
        <PushOpenListener />
        <InstallGuide />
        {children}
      </body>
    </html>
  );
}
