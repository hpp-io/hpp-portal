import React from 'react';
import type { Metadata } from 'next';
import AirdropDetailClient from './AirdropDetailClient';
import { getAirdropEventIds } from '../mockData';

export const metadata: Metadata = {
  title: 'Airdrop Detail | HPP Portal',
  description: 'HPP Airdrop detail page',
};

export async function generateStaticParams() {
  const ids = await getAirdropEventIds();
  return ids.map((id) => ({ id }));
}

export default async function AirdropDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AirdropDetailClient id={id} />;
}
