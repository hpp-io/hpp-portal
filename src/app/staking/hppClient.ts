'use client';

import React from 'react';
import { createPublicClient, http } from 'viem';
import { hpp, hppSepolia } from 'viem/chains';

export function useHppChain() {
  return React.useMemo(() => {
    const id = Number(process.env.NEXT_PUBLIC_HPP_CHAIN_ID || '181228');
    const chain = id === 190415 ? hpp : hppSepolia;
    const rpcUrl = (process.env.NEXT_PUBLIC_HPP_RPC_URL as string) || chain.rpcUrls.default.http[0] || '';
    return {
      chain,
      rpcUrl,
      id: chain.id,
      name: chain.name,
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
