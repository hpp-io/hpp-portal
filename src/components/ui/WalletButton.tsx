'use client';

import '@reown/appkit-ui';
import React from 'react';
import { useAppKit } from '@reown/appkit/react';
import Button from './Button';
import { MobileWalletConnectIcon } from '@/assets/icons';
import { useAccount } from 'wagmi';

interface WalletButtonProps {
  labelOverride?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'white' | 'black';
}

export default function WalletButton({
  labelOverride,
  size = 'sm',
  className = '',
  color = 'white',
}: WalletButtonProps) {
  const { open } = useAppKit();
  const { address, status } = useAccount();
  const avatarRef = React.useRef<any>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (avatarRef.current && address) {
      avatarRef.current.address = address;
      avatarRef.current.setAttribute('address', address);
    }
  }, [address]);

  // Only show Connect when wagmi resolved to disconnected
  const showAvatar = mounted && status === 'connected' && !!address;
  const showConnect = mounted && status === 'disconnected';
  const isResolving = mounted && (status === 'connecting' || status === 'reconnecting');

  // Keep layout stable while resolving
  const boxClass = 'w-9 h-9';
  // Hover-only subtle scale effect for avatar button (no fade to avoid flicker)

  return (
    <>
      {!mounted || isResolving ? (
        <div className={`${boxClass} rounded-full`} aria-hidden />
      ) : showAvatar ? (
        <button
          type="button"
          aria-label="Open account"
          className={`cursor-pointer inline-flex items-center justify-center rounded-full overflow-hidden ${boxClass} transform transition-transform duration-200 ease-out hover:scale-110 will-change-transform`}
          onClick={() => open({ view: 'Account' })}
        >
          {React.createElement('wui-avatar', {
            ref: avatarRef,
            address,
          })}
        </button>
      ) : showConnect ? (
        <>
          <button
            type="button"
            onClick={() => open({ view: 'Connect' })}
            className="hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent max-[767px]:inline-flex focus:outline-none focus-visible:outline-none"
            aria-label={labelOverride || 'Connect Wallet'}
          >
            <MobileWalletConnectIcon className="h-9 w-9" aria-hidden />
          </button>
          <Button
            variant={color}
            size={size}
            onClick={() => open({ view: 'Connect' })}
            className={['max-[767px]:hidden', className].filter(Boolean).join(' ')}
          >
            {labelOverride || 'Connect Wallet'}
          </Button>
        </>
      ) : (
        <div className={`${boxClass} rounded-full`} aria-hidden />
      )}
    </>
  );
}
