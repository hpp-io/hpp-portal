import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AppkitProvider from '@/context';
import { ToastProvider } from '@/hooks/useToast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'HPP Portal',
  description:
    'Interact with the HPP Mainnet network — from bridging assets to participating in governance. Experience fast, secure, and cost-effective transactions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AppkitProvider cookies={null}>
          <ToastProvider>{children}</ToastProvider>
        </AppkitProvider>
      </body>
    </html>
  );
}
