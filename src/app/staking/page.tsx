import React from 'react';
import type { Metadata } from 'next';
import StakingClient from './StakingClient';

export const metadata: Metadata = {
  title: 'Staking | HPP Portal',
  description: 'Stake your HPP to earn rewards and gain governance voting power across the HPP ecosystem.',
};

export default function StakingPage() {
  return <StakingClient />;
}

