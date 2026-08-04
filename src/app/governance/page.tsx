import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import GovernanceClient from './GovernanceClient';

export const metadata: Metadata = {
  title: 'Governance | HPP Portal',
  description: 'Join HPP governance through community forum, voting, and governance participation channels.',
};

export default function Governance() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <GovernanceClient />
    </Suspense>
  );
}
