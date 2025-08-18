'use client';

import React from 'react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';

interface WalletButtonProps {
  labelOverride?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function WalletButton({ labelOverride, size = 'md', className = '' }: WalletButtonProps) {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const handleClick = () => {
    open();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const basePadding = size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2';

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-3">
        <button
          onClick={handleDisconnect}
          className={`px-3 py-1.5 text-sm font-normal text-gray-700 bg-gray-200 border border-gray-300 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0 active:outline-none transition-colors whitespace-nowrap cursor-pointer ${className}`}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center ${basePadding} text-sm font-medium text-[#000000] bg-white rounded-[18px] hover:bg-gray-100 focus:outline-none focus:ring-0 focus:ring-offset-0 active:outline-none transition-colors whitespace-nowrap cursor-pointer ${className}`}
    >
      {labelOverride || 'Connect Wallet'}
    </button>
  );
}
