import React from 'react';
import type { Metadata } from 'next';
// import MigrationClient from './MigrationClient';
import TempolaryMigrationClient from './TempolaryMigrationClient';

export const metadata: Metadata = {
  title: 'Migration | HPP Portal',
  description: 'Stay tuned for updates on the upcoming migration!',
  // description: 'Swap your legacy AERGO tokens to HPP and join the new AI-native ecosystem — fast, low-cost, and secure.',
};

export default function MigrationPage() {
  return <TempolaryMigrationClient />;
  // return <MigrationClient />;
}
