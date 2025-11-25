// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RRV | React Rendering Visualization Tool",
  description:
    "RRV는 React 컴포넌트의 렌더링 흐름을 시각화하여 useState, 전역 상태, JSX 구조를 한 눈에 파악할 수 있게 해주는 웹 도구임.",
  metadataBase: new URL("https://kyu-rrv.vercel.app"), // 실제 도메인으로 교체 필요.
  keywords: [
    "React",
    "Rendering",
    "Visualization",
    "Re-render",
    "RRV",
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
    title: "RRV | React Rendering Visualization Tool",
    description:
      "React 렌더링 흐름과 JSX 구조를 SVG 그래프로 분석하는 시각화 도구 RRV.",
    url: "https://kyu-rrv.vercel.app",
    siteName: "RRV",
    type: "website",
    images: ["https://kyu-rrv.vercel.app/opengraph-image.png"],
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-neutral-100 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
