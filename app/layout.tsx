// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "crv.",
  description:
    "crv는 React 컴포넌트의 렌더링 흐름을 시각화하여 useRef, useState, 전역 상태, JSX 구조 등을 한 눈에 파악할 수 있게 해주는 웹 도구입니다.",
  metadataBase: new URL("https://react-crv.vercel.app"),
  keywords: [
    "React",
    "Code-based",
    "Rendering",
    "Visualization",
    "Re-render",
    "crv",
    "CRV",
    "React performance",
    "React optimization",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      {
        url: "/favicon-48x48.png",
        type: "image/png",
        sizes: "48x48",
      },
      {
        url: "/favicon-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "/favicon-16x16.png",
        type: "image/png",
        sizes: "16x16",
      },
    ],
  },
  openGraph: {
    title: "crv. React Code-based Rendering Visualization Tool.",
    description:
      "React 렌더링 흐름과 JSX 구조를 SVG 그래프로 분석하는 시각화 도구 crv.",
    url: "https://react-crv.vercel.app",
    siteName: "crv",
    type: "website",
    images: ["https://react-crv.vercel.app/opengraph-image.png"],
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-neutral-100 text-neutral-900 antialiased">
        <main className="flex h-screen flex-col">
          <header className="border-b border-neutral-200 bg-white">
            <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="text-[20px] font-semibold tracking-tight">
                  crv.
                </span>
                <span className="text-[15px] text-neutral-500">
                  React Code-based Rendering Visualization Tool
                </span>
              </Link>
            </div>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
