import { cookieStorage, createStorage } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, sepolia } from '@reown/appkit/networks';

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.NEXT_PUBLIC_APP_KIT_PROJECT_ID;

if (!projectId) {
  throw new Error('Project ID is not defined');
}

// Select Ethereum network from NEXT_PUBLIC_CHAIN
const isSepolia = (process.env.NEXT_PUBLIC_CHAIN || 'mainnet').toLowerCase() === 'sepolia';
export const networks = isSepolia ? [sepolia] : [mainnet];

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
