import React from 'react';
import type { Metadata } from 'next';
import EcosystemClient from './EcosystemClient';

export const metadata: Metadata = {
  title: 'Ecosystem | HPP Portal',
  description:
    'Explore the HPP Ecosystem - an AI-native infrastructure designed for the full data lifecycle, uniting intelligent agents, verifiable off-chain computation, and decentralized applications.',
};

export default function Ecosystem() {
  return <EcosystemClient />;
}
