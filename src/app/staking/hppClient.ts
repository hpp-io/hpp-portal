'use client';

import React from 'react';
import { createPublicClient, http } from 'viem';

export function useHppChain() {
  return React.useMemo(() => {
    const env = (process.env.NEXT_PUBLIC_ENV || 'development').toLowerCase();
    const isProd = env === 'production';
    const id = isProd ? 190415 : 181228;
    const name = isProd ? 'HPP Mainnet' : 'HPP Sepolia';
    const rpcUrl =
      (process.env.NEXT_PUBLIC_HPP_RPC_URL as string) || (isProd ? 'https://mainnet.hpp.io' : 'https://sepolia.hpp.io');
    return {
      chain: {
        id,
        name,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
      } as const,
      rpcUrl,
      id,
      name,
    };
  }, []);
}

export function useHppPublicClient() {
  const { chain, rpcUrl } = useHppChain();

  const publicClient = React.useMemo(() => {
    return createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }, [chain, rpcUrl]);

  return publicClient;
}
