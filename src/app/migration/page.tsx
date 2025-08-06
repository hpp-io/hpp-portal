import React from 'react';
import type { Metadata } from 'next';
import MigrationClient from './MigrationClient';

export const metadata: Metadata = {
  title: 'Migration | HPP Portal',
  description:
    'Migrate your AERGO tokens to HPP tokens on the HPP Mainnet. Fast, secure, and cost-effective token migration.',
};

export default function MigrationPage() {
  return <MigrationClient />;
}
