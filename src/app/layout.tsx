import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trust It — Encrypted Messenger",
  description: "Send end-to-end encrypted messages, images, and videos. Find friends by UID only.",
  keywords: ["encrypted chat", "secure messenger", "E2E encryption", "private messaging"],
  authors: [{ name: "Trust It" }],
  manifest: "/manifest.json",
  applicationName: "Trust It",
  appleWebApp: {
    capable: true,
    title: "Trust It",
    statusBarStyle: "black-translucent",
    startupImage: [
      "/icons/apple-touch-icon.png",
    ],
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-167x167.png", sizes: "167x167", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
};

export const viewport: Viewport = {
  themeColor: "#d946ef",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {/* PWA iOS meta tags (Next.js doesn't fully cover these) */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Trust It" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="application-name" content="Trust It" />
        <meta name="msapplication-TileColor" content="#d946ef" />
        <meta name="msapplication-tap-highlight" content="no" />
        {/* Service worker — minimal, no chunk caching. Unregisters old stale ones first. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  // First, unregister any old service workers
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    return Promise.all(regs.map(function(r) { return r.unregister(); }));
                  }).then(function() {
                    // Clear old caches
                    if (window.caches) {
                      return caches.keys().then(function(names) {
                        return Promise.all(names.map(function(n) { return caches.delete(n); }));
                      });
                    }
                  }).then(function() {
                    // Register the fresh minimal service worker
                    return navigator.serviceWorker.register('/sw.js');
                  }).catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        style={{ backgroundColor: '#0a0a0a', color: '#fafafa' }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
