import { cookieStorage, createStorage, http, createConfig } from '@wagmi/core';
import { mainnet, arbitrum } from 'wagmi/chains';
import { metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.NEXT_PUBLIC_APP_KIT_PROJECT_ID;

if (!projectId) {
  throw new Error('Project ID is not defined');
}

export const networks = [mainnet, arbitrum];

// Set up the Wagmi Config
export const config = createConfig({
  chains: [mainnet, arbitrum],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  connectors: [
    metaMask(),
    walletConnect({ projectId }),
    coinbaseWallet({
      appName: 'HPP Portal',
      // Use version 4 for the latest Coinbase Wallet SDK
      version: '4',
      // Set preference to 'all' to show all wallet options
      preference: 'all',
      // Set app logo URL if available
      appLogoUrl: process.env.NEXT_PUBLIC_APP_LOGO_URL,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
  },
});
