import React from 'react';
import type { Metadata } from 'next';
import SelectionClient from './SelectionClient';

export const metadata: Metadata = {
  title: 'Migration | HPP Portal',
  description: 'Choose a token to migrate path.',
};

export default function MigrationTestPage() {
  return <SelectionClient />;
}
