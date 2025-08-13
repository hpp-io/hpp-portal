'use client';

import React from 'react';
import Link from 'next/link';
import WalletButton from '@/components/ui/WalletButton';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <>
      {/* <1200px */}
      <div className="max-[1200px]:block hidden bg-black border-b border-[#161616] px-4 h-14">
        <div className="grid grid-cols-3 items-center h-full">
          <div className="flex">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-gray-900 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          <div className="flex justify-center">
            <span className="text-sm font-semibold text-white cursor-default">HPP Portal</span>
          </div>
          {/* <div className="flex justify-end">
            <WalletButton size="sm" labelOverride="Connect" />
          </div> */}
        </div>
      </div>

      {/* ≥1200px */}
      <div className="min-[1200px]:block hidden bg-black border-b border-[#161616] px-6 py-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-white cursor-default">HPP Portal</span>
          {/* <div className="flex items-center">
            <WalletButton />
          </div> */}
        </div>
      </div>
    </>
  );
}
