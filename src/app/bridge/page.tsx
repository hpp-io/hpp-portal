import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import BridgeClient from './BridgeClient';

export const metadata: Metadata = {
  title: 'Bridge | HPP Portal',
  description: 'Move your assets between Ethereum and HPP Mainnet — fast and low-cost.',
};

export default function BridgePage() {
  return (
    <Suspense fallback={null}>
      <BridgeClient />
    </Suspense>
  );
}
