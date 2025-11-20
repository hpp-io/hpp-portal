import { cookieStorage, createStorage } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, sepolia } from '@reown/appkit/networks';

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.NEXT_PUBLIC_APP_KIT_PROJECT_ID;

if (!projectId) {
  throw new Error('Project ID is not defined');
}

// Select network from NEXT_PUBLIC_ENV
const selectedEnv = (process.env.NEXT_PUBLIC_ENV || 'development').toLowerCase();
const selectedChain = selectedEnv === 'production' ? 'mainnet' : 'sepolia';
export const networks = selectedChain === 'mainnet' ? [mainnet] : [sepolia];

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
