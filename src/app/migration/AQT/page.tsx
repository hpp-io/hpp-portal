import React from 'react';
import type { Metadata } from 'next';
import MigrationClient from '../../MigrationClient';

export const metadata: Metadata = {
  title: 'Migration (AQT) | HPP Portal',
  description: 'AQT → HPP migration.',
  robots: { index: false, follow: false },
};

export default function AqtMigrationTestPage() {
  return <MigrationClient token="AQT" />;
}
