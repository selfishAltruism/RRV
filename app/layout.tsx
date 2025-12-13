import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "crv.",
  description:
    "crv is a code-based visualization tool that helps developers understand React rendering behavior, including useState, useRef, global state, and JSX structure, at a glance.",
  metadataBase: new URL("https://react-crv.vercel.app"),
  keywords: [
    "React",
    "Rendering",
    "Visualization",
    "React performance",
    "React optimization",
    "Re-render",
    "Component rendering flow",
    "crv",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
  },
  openGraph: {
    title: "crv. – React Code-based Rendering Visualization Tool",
    description:
      "Visualize React rendering flows and JSX structures as an interactive SVG graph. Understand re-renders, state dependencies, and effects instantly.",
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
    <html lang="en">
      <body className="min-h-screen bg-neutral-100 text-neutral-900 antialiased">
        <main className="flex h-screen flex-col">
          <header className="border-b border-neutral-200 bg-neutral-800">
            <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="text-[21px] font-semibold tracking-tight text-white">
                  crv.
                </span>
                <span className="text-[15px] text-white/70">
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
