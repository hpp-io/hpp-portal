import type { Metadata } from 'next';
import './globals.css';
import AppkitProvider from '@/context';
import { ToastProvider } from '@/hooks/useToast';

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
      <body className="antialiased">
        <AppkitProvider cookies={null}>
          <ToastProvider>{children}</ToastProvider>
        </AppkitProvider>
      </body>
    </html>
  );
}
