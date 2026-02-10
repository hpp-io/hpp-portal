import React from 'react';
import type { Metadata } from 'next';
import StakingClient from './StakingClient';

export const metadata: Metadata = {
  title: 'Staking | HPP Portal',
  description: 'Stake your HPP to earn rewards and gain governance voting power across the HPP ecosystem.',
  openGraph: {
    title: 'Staking | HPP Portal',
    description: 'Stake your HPP to earn rewards and gain governance voting power across the HPP ecosystem.',
    images: ['/staking_s1_og.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Staking | HPP Portal',
    description: 'Stake your HPP to earn rewards and gain governance voting power across the HPP ecosystem.',
    images: ['/staking_s1_og.jpg'],
  },
};


export default function StakingPage() {
  return <StakingClient />;
}
