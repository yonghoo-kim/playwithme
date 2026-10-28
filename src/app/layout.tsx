import type { Metadata } from "next";
import { Jua } from "next/font/google";
import "./globals.css";

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
    <html lang="ko">
      <body className={`${jua.variable} font-jua bg-yellow-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
