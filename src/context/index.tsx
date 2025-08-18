'use client';

import { wagmiAdapter, projectId } from '@/config/walletConfig';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { mainnet, sepolia } from '@reown/appkit/networks';
import React, { type ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';

// Set up queryClient
const queryClient = new QueryClient();

if (!projectId) {
  throw new Error('Project ID is not defined');
}

// Set up metadata
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';
const metadata = {
  name: 'HPP Portal',
  description:
    'Welcome to the HPP Portal, where you can migrate your assets, bridge across networks, and start building on AI-native Layer 2 infrastructure.',
  url: siteUrl,
  icons: [`${siteUrl}/ogImage.png`],
};

// Create the AppKit
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet, sepolia],
  defaultNetwork: mainnet,
  metadata: metadata,
  themeMode: 'light',
  allowUnsupportedChain: true,
  featuredWalletIds: ['c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96'],
  includeWalletIds: ['c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96'],
  debug: process.env.NODE_ENV !== 'production',
  enableWalletGuide: true,
  allWallets: 'HIDE',
  enableWalletConnect: true,
  termsConditionsUrl: 'https://paper.hpp.io/HPP_TermsConditions_v1.4.pdf',
  privacyPolicyUrl: 'https://paper.hpp.io/HPP_PrivacyPolicy_v1.6.pdf',
  features: {
    legalCheckbox: true,
    analytics: true, // Optional - defaults to your Cloud configuration
    swaps: false,
    onramp: false,
    socials: false,
    email: false,
  },
});

function AppkitProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default AppkitProvider;
