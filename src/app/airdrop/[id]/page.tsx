import React from 'react';
import type { Metadata } from 'next';
import AirdropDetailClient from './AirdropDetailClient';

export const metadata: Metadata = {
  title: 'Airdrop Detail | HPP Portal',
  description: 'HPP Airdrop detail page',
};

export async function generateStaticParams() {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_STAKING_API_URL;
    if (!apiBaseUrl) return [];

    const types = ['hpp', 'dapp', 'collaboration'] as const;
    const results = await Promise.all(
      types.map(async (t) => {
        const res = await fetch(`${apiBaseUrl}/airdrop/type/${t}`, {
          headers: { accept: 'application/json' },
          // ensure build-time fetch doesn't get stuck with stale cache
          cache: 'no-store',
        });
        if (!res.ok) return [];
        const raw: any = await res.json();
        const data = raw?.data ?? raw?.events ?? raw;
        const items: any[] = Array.isArray(data) ? data : [];
        return items.map((e) => String(e?.id || '')).filter(Boolean);
      })
    );

    const uniqueIds = Array.from(new Set(results.flat()));
    return uniqueIds.map((id) => ({ id }));
  } catch {
    // If API is unavailable during build, skip pre-generation (route can still render dynamically).
    return [];
  }
}

export default async function AirdropDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AirdropDetailClient id={id} />;
}
