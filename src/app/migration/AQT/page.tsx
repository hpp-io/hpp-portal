import React from 'react';
import type { Metadata } from 'next';
import MigrationClient from '../MigrationClient';

export const metadata: Metadata = {
  title: 'Migration (AQT) | HPP Portal',
  description: 'Move your AQT tokens to the HPP Mainnet using the official migration paths.',
};

export default function AqtMigrationTestPage() {
  return <MigrationClient token="AQT" />;
}
