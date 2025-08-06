'use client';

import { useConnect, useDisconnect } from 'wagmi';
import { useState } from 'react';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Wallet options configuration
const walletOptions = [
  {
    id: 'metaMask',
    name: 'MetaMask',
    description: 'Connect using browser wallet',
    icon: 'MM',
    connectorNames: ['metaMask'],
  },
  {
    id: 'coinbaseWallet',
    name: 'Coinbase Wallet',
    description: 'Connect using Coinbase Wallet',
    icon: 'CB',
    connectorNames: ['coinbaseWalletSDK', 'coinbaseWallet'],
  },
  {
    id: 'walletConnect',
    name: 'WalletConnect',
    description: 'Scan with WalletConnect, Rainbow, or other mobile wallets',
    icon: 'WC',
    connectorNames: ['walletConnect', 'walletConnectV2'],
  },
];

export default function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const { connect, connectors, isPending } = useConnect();
  const [showMore, setShowMore] = useState(false);

  if (!isOpen) return null;

  const handleConnect = (connector: any) => {
    // For Coinbase Wallet, enable instant onboarding
    if (connector.name.toLowerCase().includes('coinbase')) {
      connect({
        connector,
        chainId: 1, // Default to mainnet
      });
    } else {
      connect({ connector });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Connect a Wallet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <p className="text-gray-600 mb-6">
          Choose a wallet to connect. If you don't have a wallet, you can select a provider and create one.
        </p>

        {/* Wallet Options */}
        <div className="space-y-2 mb-4">
          {connectors.map((connector) => {
            // connector에 맞는 옵션 찾기
            const option = walletOptions.find(
              (opt) =>
                opt.connectorNames.includes(connector.id) ||
                opt.connectorNames.some(
                  (name) => connector.name && connector.name.toLowerCase().includes(name.toLowerCase())
                )
            );

            // 옵션을 찾지 못한 경우 기본 옵션 생성
            const displayOption = option || {
              id: connector.id,
              name: connector.name || connector.id,
              description: `Connect using ${connector.name || connector.id}`,
              icon: (connector.name || connector.id).substring(0, 2).toUpperCase(),
              connectorNames: [connector.id],
            };

            return (
              <button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg transition-colors disabled:opacity-50 hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-white font-semibold">
                    {displayOption.icon}
                  </div>
                  <div className="text-left">
                    <div className="font-medium flex items-center gap-2">{displayOption.name}</div>
                    <div className="text-sm text-gray-500">{displayOption.description}</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </div>

        {/* Show More Wallets */}
        <button
          onClick={() => setShowMore(!showMore)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-6"
        >
          Show more wallets
        </button>

        {/* Disclaimer */}
        <p className="text-xs text-gray-500 text-center">
          By connecting a wallet, you agree to{' '}
          <a href="#" className="text-blue-600 hover:underline">
            HPP's Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-blue-600 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
