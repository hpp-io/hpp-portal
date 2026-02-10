'use client';

import { wagmiAdapter, projectId } from '@/config/walletConfig';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { mainnet, sepolia } from '@reown/appkit/networks';
import type { Chain } from 'viem';
import React, { type ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';
import { legalLinks } from '@/config/navigation';

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
  icons: [`${siteUrl}/ogImage.jpg`],
};

// Determine AppKit networks from NEXT_PUBLIC_CHAIN
const selectedChainEnv = (process.env.NEXT_PUBLIC_CHAIN || 'mainnet').toLowerCase();
const appKitNetworks = (selectedChainEnv === 'sepolia' ? [sepolia] : [mainnet]) as [
  typeof sepolia | typeof mainnet,
  ...(typeof sepolia | typeof mainnet)[],
];
const appKitDefaultNetwork = (selectedChainEnv === 'sepolia' ? sepolia : mainnet) as typeof sepolia | typeof mainnet;
const termsLink = legalLinks.find((l) => (l.label || '').toLowerCase().includes('terms'))?.href;
const privacyLink = legalLinks.find((l) => (l.label || '').toLowerCase().includes('privacy'))?.href;

// Create the AppKit
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: appKitNetworks,
  defaultNetwork: appKitDefaultNetwork,
  metadata: metadata,
  themeMode: 'dark',
  allowUnsupportedChain: true,
  featuredWalletIds: ['c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96'],
  includeWalletIds: ['c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96'],
  debug: process.env.NODE_ENV !== 'production',
  enableWalletGuide: true,
  allWallets: 'HIDE',
  enableWalletConnect: true,
  termsConditionsUrl: termsLink,
  privacyPolicyUrl: privacyLink,
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
