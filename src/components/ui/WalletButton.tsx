'use client';

import React, { useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import WalletConnectModal from './WalletConnectModal';

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-3">
        <button
          onClick={handleDisconnect}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Connect Wallet
      </button>

      <WalletConnectModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  );
}
