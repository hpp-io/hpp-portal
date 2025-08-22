'use client';

import React from 'react';
import { useAppKit } from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import Button from './Button';

interface WalletButtonProps {
  labelOverride?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function WalletButton({ labelOverride, size = 'lg', className = '' }: WalletButtonProps) {
  const { open } = useAppKit();

  const handleClick = () => {
    open();
  };

  return (
    <Button variant="black" size={size} onClick={handleClick} className={className}>
      {labelOverride || 'Connect Wallet'}
    </Button>
  );
}
