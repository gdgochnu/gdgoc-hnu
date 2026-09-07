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

        {/* Browser Extension Hydration Sanitizer (e.g. Bitdefender TrafficLight bis_skin_checked) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 1. Remove any pre-existing bis_skin_checked attributes injected by extensions
                  function cleanNodes(root) {
                    if (!root) return;
                    if (root.nodeType === 1 && root.hasAttribute('bis_skin_checked')) {
                      root.removeAttribute('bis_skin_checked');
                    }
                    if (root.querySelectorAll) {
                      var list = root.querySelectorAll('[bis_skin_checked]');
                      for (var i = 0; i < list.length; i++) {
                        list[i].removeAttribute('bis_skin_checked');
                      }
                    }
                  }

                  // 2. Active MutationObserver to strip bis_skin_checked synchronously
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
                        m.target.removeAttribute('bis_skin_checked');
                      } else if (m.type === 'childList') {
                        for (var j = 0; j < m.addedNodes.length; j++) {
                          cleanNodes(m.addedNodes[j]);
                        }
                      }
                    }
                  });

                  observer.observe(document.documentElement, {
                    attributes: true,
                    subtree: true,
                    childList: true,
                    attributeFilter: ['bis_skin_checked']
                  });

                  // Clean initial document
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function() { cleanNodes(document.body); });
                  } else {
                    cleanNodes(document.body);
                  }

                  // 3. Filter extension mismatch noise from console.error in dev
                  var origError = console.error;
                  console.error = function() {
                    for (var a = 0; a < arguments.length; a++) {
                      var arg = arguments[a];
                      if (typeof arg === 'string' && (arg.indexOf('bis_skin_checked') !== -1 || arg.indexOf('bis_skin') !== -1)) {
                        return;
                      }
                    }
                    origError.apply(console, arguments);
                  };
                } catch (e) {}
              })();
            `,
          }}
        />
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
