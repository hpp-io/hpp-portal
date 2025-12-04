import type { Metadata } from 'next';
import './globals.css';
import AppkitProvider from '@/context';
import { ToastProvider } from '@/hooks/useToast';
import localFont from 'next/font/local';

const pretendard = localFont({
  src: '../assets/fonts/web/variable/woff2/PretendardVariable.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-pretendard',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000'),
  title: 'HPP Portal',
  description:
    'Welcome to the HPP Portal, where you can migrate your assets, bridge across networks, and start building on AI-native Layer 2 infrastructure.',
  openGraph: {
    images: ['/ogImage.png?v=1'],
    siteName: 'HPP Portal',
  },
  twitter: {
    images: ['/ogImage_v2.png?v=1'],
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pretendard.variable}>
      <body className="antialiased">
        <AppkitProvider cookies={null}>
          <ToastProvider>{children}</ToastProvider>
        </AppkitProvider>
      </body>
    </html>
  );
}
