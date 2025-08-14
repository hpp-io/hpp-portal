'use client';

import React from 'react';
import { MobileMenuIcon, BackIcon, HPPPortalIcon } from '@/assets/icons';
// import WalletButton from '@/components/ui/WalletButton';

interface HeaderProps {
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
  onBackClick?: () => void;
}

export default function Header({ onMenuClick, isSidebarOpen = false, onBackClick }: HeaderProps) {
  return (
    <>
      {/* <1200px */}
      <div className="max-[1200px]:block hidden bg-black border-b border-[#161616] px-4 h-[66px]">
        <div className="grid grid-cols-3 items-center h-full">
          <div className="flex">
            <button
              onClick={isSidebarOpen ? onBackClick : onMenuClick}
              className="p-2 rounded-lg cursor-pointer"
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {isSidebarOpen ? (
                <BackIcon className="w-7.5 h-7.5 text-gray-300" />
              ) : (
                <MobileMenuIcon className="w-7.5 h-7.5 text-gray-300" />
              )}
            </button>
          </div>
          <div></div>
          <div className="flex justify-end">
            <HPPPortalIcon className="w-auto h-10" />
          </div>
        </div>
      </div>

      {/* ≥1200px */}
      <div className="min-[1200px]:block hidden bg-black border-b border-[#161616] px-6 h-[85px]">
        <div className="flex items-center justify-between h-full">
          <HPPPortalIcon className="w-auto h-10" />
          {/* <div className="flex items-center">
            <WalletButton />
          </div> */}
        </div>
      </div>
    </>
  );
}
