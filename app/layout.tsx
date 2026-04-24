import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

// ✅ SAFE BASE URL
const BASE_URL = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    );
  } catch {
    return new URL("http://localhost:3000");
  }
})();

export const metadata: Metadata = {
  title: {
    default: "QuantShield AI",
    template: "%s | QuantShield AI",
  },

  description:
    "Risk-aware portfolio intelligence with live market data, explainable AI models, and investor-facing portfolio insights.",

  metadataBase: BASE_URL,

  // ✅ SEO
  alternates: {
    canonical: BASE_URL.toString(),
  },

  // ✅ OPEN GRAPH
  openGraph: {
    title: "QuantShield AI",
    description:
      "AI-powered portfolio recommendation platform with explainability, SHAP analysis, and real-time market signals.",
    url: BASE_URL.toString(),
    siteName: "QuantShield AI",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "QuantShield AI",
      },
    ],
  },

  // ✅ TWITTER
  twitter: {
    card: "summary_large_image",
    title: "QuantShield AI",
    description:
      "Explainable AI portfolio recommendations with live market data and risk-aware allocation.",
    images: ["/og-image.png"],
  },

  // ✅ ICON
  icons: {
    icon: "/favicon.ico",
  },
};

// ✅ MOBILE VIEWPORT
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-shell min-h-screen antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-white/8 bg-[#04141d]/88 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 md:px-8 lg:px-12">
              <Link href="/" className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-1.5 shadow-lg shadow-cyan-950/20">
                  <Image
                    src="/quantshield-logo.svg"
                    alt="QuantShield AI logo"
                    width={34}
                    height={34}
                    priority
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-[0.18em] text-cyan-300/90">
                    QUANTSHIELD AI
                  </p>
                  <p className="text-xs text-slate-400">
                    Portfolio intelligence workspace
                  </p>
                </div>
              </Link>

              <p className="hidden text-xs uppercase tracking-[0.22em] text-slate-500 md:block">
                Clean portfolio review
              </p>
            </div>
          </header>

          <div className="flex-1">{children}</div>

<footer className="border-t border-white/8 bg-[#04141d]/88 backdrop-blur">
  <div className="mx-auto flex w-full max-w-7xl items-center justify-center px-5 py-3 text-xs text-slate-400 md:px-8 lg:px-12">
    <p>© 2026 QuantShield AI. All rights reserved.</p>
  </div>
</footer>
        </div>
      </body>
    </html>
  );
}
