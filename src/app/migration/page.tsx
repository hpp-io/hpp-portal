import React from 'react';
import type { Metadata } from 'next';
import SelectionClient from './SelectionClient';

export const metadata: Metadata = {
  title: 'Migration | HPP Portal',
  description: 'Select the option that matches your current token holdings to migrate into the HPP Mainnet.',
};

export default function MigrationTestPage() {
  return <SelectionClient />;
}
