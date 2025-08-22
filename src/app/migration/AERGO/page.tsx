import React from 'react';
import type { Metadata } from 'next';
import MigrationClient from '../MigrationClient';

export const metadata: Metadata = {
  title: 'Migration (AERGO) | HPP Portal',
  description: 'Move your AERGO tokens to the HPP Mainnet using the official migration paths.',
};

export default function AergoMigrationTestPage() {
  return <MigrationClient token="AERGO" />;
}
