'use client';

import React from 'react';
import { createPublicClient, http } from 'viem';

export function useHppPublicClient() {
  const hppChain = React.useMemo(() => {
    const env = (process.env.NEXT_PUBLIC_ENV || 'development').toLowerCase();
    if (env === 'production') {
      return {
        id: 190415,
        name: 'HPP Mainnet',
        rpcUrl: (process.env.NEXT_PUBLIC_HPP_RPC_URL as string) || 'https://mainnet.hpp.io',
      };
    }
    return {
      id: 181228,
      name: 'HPP Sepolia',
      rpcUrl: (process.env.NEXT_PUBLIC_HPP_RPC_URL as string) || 'https://sepolia.hpp.io',
    };
  }, []);

  const publicClient = React.useMemo(() => {
    return createPublicClient({
      chain: {
        id: hppChain.id,
        name: hppChain.name,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [hppChain.rpcUrl] } },
      } as const,
      transport: http(hppChain.rpcUrl),
    });
  }, [hppChain]);

  return publicClient;
}
