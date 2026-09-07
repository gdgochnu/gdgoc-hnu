import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavigationProgressBar } from "@/components/layout/NavigationProgressBar";

export const metadata: Metadata = {
  title: "GDGoC HNU OS — Chapter Operating System",
  description: "One platform. One source of truth. For people, events, tasks, attendance, growth. Google Developer Groups on Campus — Helwan National University.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GDGoC HNU OS",
  },
  applicationName: "GDGoC HNU OS",
  authors: [{ name: "GDGoC Helwan National University" }],
};

export const viewport: Viewport = {
  themeColor: "#0B0F19",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body suppressHydrationWarning>
        <NavigationProgressBar />
        <div className="ambient-glow" aria-hidden="true" suppressHydrationWarning />
        {children}

        {/* Client Service Worker Registration: Production Only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function() {});
                  });
                } else {
                  // In local development, unregister any active service worker to prevent caching loops and dev lag
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (var i = 0; i < registrations.length; i++) {
                      registrations[i].unregister();
                    }
                  });
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
