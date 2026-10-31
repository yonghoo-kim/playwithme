import type { Metadata } from "next";
import { Jua } from "next/font/google";
import "./globals.css";
import NavigationProgress from "./NavigationProgress";
import PlaygroundBackground from "@/components/PlaygroundBackground";
import PushOpenListener from "@/components/PushOpenListener";
import { DAY_PHASE_SCRIPT } from "@/lib/dayPhase";
import { WEATHER_CACHE_SCRIPT } from "@/lib/weatherCache";

const jua = Jua({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-jua",
});

export const metadata: Metadata = {
  title: "나랑 놀자",
  description: "친구들과 실시간으로 놀이 상태를 공유해요",
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
      </head>
      <body className={`${jua.variable} font-jua bg-sky-100 antialiased`}>
        <PlaygroundBackground />
        <NavigationProgress />
        <PushOpenListener />
        {children}
      </body>
    </html>
  );
}
