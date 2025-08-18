import React from 'react';
import type { Metadata } from 'next';
import SelectionClient from './SelectionClient';

export const metadata: Metadata = {
  title: 'Migration (Test) | HPP Portal',
  description: 'Choose a token to migrate.',
  robots: { index: false, follow: false },
};

export default function MigrationTestPage() {
  return <SelectionClient />;
}
