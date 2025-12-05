import type { Metadata } from 'next';
import Script from 'next/script';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Factory Wager - Trading Mini App',
  description: 'Telegram Mini App for Factory Wager trading platform',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: '#1a1a1a',
  manifest: '/miniapp/manifest.json',
  other: {
    'telegram-web-app': 'yes',
  },
};

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Telegram Mini App SDK */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
