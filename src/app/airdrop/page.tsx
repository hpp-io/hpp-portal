import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import AirdropClient from './AirdropClient';

export const metadata: Metadata = {
  title: 'Airdrop | HPP Portal',
  description: 'Discover, join, and claim all airdrop events across the HPP ecosystem, seamlessly in one place.',
  openGraph: {
    title: 'Airdrop | HPP Portal',
    description: 'Discover, join, and claim all airdrop events across the HPP ecosystem, seamlessly in one place.',
    images: ['/airdrop_og.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Airdrop | HPP Portal',
    description: 'Discover, join, and claim all airdrop events across the HPP ecosystem, seamlessly in one place.',
    images: ['/airdrop_og.jpg'],
  },
};

export default function AirdropPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AirdropClient />
    </Suspense>
  );
}
