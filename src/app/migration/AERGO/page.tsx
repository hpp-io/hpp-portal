import React from 'react';
import type { Metadata } from 'next';
import MigrationClient from '../MigrationClient';

export const metadata: Metadata = {
  title: 'Migration (AERGO) | HPP Portal',
  description: 'AERGO → HPP migration.',
  robots: { index: false, follow: false },
};

export default function AergoMigrationTestPage() {
  return <MigrationClient token="AERGO" />;
}
