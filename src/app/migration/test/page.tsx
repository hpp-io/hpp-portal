import React from 'react';
import type { Metadata } from 'next';
import MigrationClient from '../MigrationClient';

export const metadata: Metadata = {
  title: 'Migration (Test) | HPP Portal',
  description: 'Temporary test route for MigrationClient. Accessible only by direct URL.',
  robots: { index: false, follow: false },
};

export default function MigrationTestPage() {
  return <MigrationClient />;
}
