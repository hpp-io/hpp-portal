'use client';

import React from 'react';
import { createPublicClient, http } from 'viem';

export function useHppChain() {
  return React.useMemo(() => {
    const id = Number(process.env.NEXT_PUBLIC_HPP_CHAIN_ID || '181228');
    const name = id === 190415 ? 'HPP Mainnet' : 'HPP Sepolia';
    const rpcUrl =
      (process.env.NEXT_PUBLIC_HPP_RPC_URL as string) ||
      (id === 190415 ? 'https://mainnet.hpp.io' : 'https://sepolia.hpp.io');
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
