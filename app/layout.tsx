import type { Metadata, Viewport } from "next";
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
      <body className="app-shell antialiased">
        {children}
      </body>
    </html>
  );
}