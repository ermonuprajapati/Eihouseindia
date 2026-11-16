import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/modules/auth/auth-context';
import { SITE_CONFIG } from '@/config/site';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteTrafficTracker } from '@/components/analytics/SiteTrafficTracker';
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
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-48x48.png?v=2', sizes: '48x48', type: 'image/png' },
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/favicon.png?v=2', sizes: '512x512', type: 'image/png' },
      { url: '/icon-192x192.png?v=2', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: [
      { url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' },
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
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=2" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png?v=2" />
        <link rel="icon" type="image/png" sizes="512x512" href="/favicon.png?v=2" />
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2" />
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
      <body suppressHydrationWarning className="min-h-screen bg-[#FAFBFD] text-[#0B1528] antialiased">
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
