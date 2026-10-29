import type { Metadata } from "next";
import { Jua } from "next/font/google";
import "./globals.css";
import NavigationProgress from "./NavigationProgress";
import PlaygroundBackground from "@/components/PlaygroundBackground";
import { DAY_PHASE_SCRIPT } from "@/lib/dayPhase";

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
    // data-phase is set by the inline script before hydration.
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#9DDCFF" />
        <script dangerouslySetInnerHTML={{ __html: DAY_PHASE_SCRIPT }} />
      </head>
      <body className={`${jua.variable} font-jua bg-sky-100 antialiased`}>
        <PlaygroundBackground />
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
