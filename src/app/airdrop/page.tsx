import React from 'react';
import type { Metadata } from 'next';
import AirdropClient from './AirdropClient';

export const metadata: Metadata = {
  title: 'Airdrop | HPP Portal',
  description: "Stay tuned for the HPP token airdrop. We're preparing something special for our community.",
};

export default function AirdropPage() {
  return <AirdropClient />;
}
