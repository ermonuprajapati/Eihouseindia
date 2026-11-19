import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/modules/auth/auth-context';
import { SITE_CONFIG } from '@/config/site';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteTrafficTracker } from '@/components/analytics/SiteTrafficTracker';
import { RouteProgressBar } from '@/components/layout/RouteProgressBar';
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/seo';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'Cambria', 'serif'],
  adjustFontFallback: true,
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

export const viewport: Viewport = {
  themeColor: '#0B1528',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: [{ url: '/favicon.ico', type: 'image/x-icon' }],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_CONFIG.name,
  },
  keywords: [
    'EI House',
    'EI House India',
    'EIHOUSE INDIA',
    'EIHOUSE',
    'Engineering Innovation House',
    'Engineering Innovation House India',
    'Monu Prajapati',
    'Er Monu Prajapati',
    'Monu Prajapati EI House',
    'Founder of EI House',
    'Founder of Engineering Innovation House',
    'Who owns EI House',
    'Electronics Engineering India',
    'Embedded Systems India',
    'Hardware Prototyping India',
    'Semiconductor Technology',
    'Robotics & Automation',
    'IoT Engineering',
    'PCB Design Services',
    'STEM Education India',
  ],
  authors: [
    { name: 'Monu Prajapati', url: `${SITE_CONFIG.url}/about#founder` },
    { name: SITE_CONFIG.name, url: SITE_CONFIG.url },
  ],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.name,
  alternates: {
    canonical: SITE_CONFIG.url,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    images: [
      {
        url: '/images/hero-semiconductor.jpg',
        width: 1200,
        height: 675,
        alt: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    images: ['/images/hero-semiconductor.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <Script id="google-analytics-gtm" strategy="lazyOnload">
          {`
            (function() {
              if (navigator.webdriver || /Chrome-Lighthouse|Headless/i.test(navigator.userAgent)) return;
              var loaded = false;
              function loadGtm() {
                if (loaded) return;
                loaded = true;
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                var f = document.getElementsByTagName('script')[0],
                    j = document.createElement('script');
                j.async = true;
                j.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-NGT8B6V8';
                f.parentNode.insertBefore(j, f);
              }
              ['scroll', 'pointerdown', 'touchstart', 'keydown', 'mousemove'].forEach(function(ev) {
                window.addEventListener(ev, loadGtm, { once: true, passive: true });
              });
            })();
          `}
        </Script>
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-[#FAFBFD] text-[#0B1528] antialiased overflow-x-clip min-w-0 w-full">
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NGT8B6V8"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <JsonLd data={buildOrganizationJsonLd()} />
        <JsonLd data={buildWebsiteJsonLd()} />
        <AuthProvider>
          <SiteTrafficTracker />
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
