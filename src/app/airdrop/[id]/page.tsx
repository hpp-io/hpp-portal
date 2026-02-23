import React from 'react';
import type { Metadata } from 'next';
import AirdropDetailClient from './AirdropDetailClient';

async function getAirdropNameById(id: string): Promise<string | null> {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_STAKING_API_URL;
    if (!apiBaseUrl) return null;

    const types = ['hpp', 'dapp', 'collaboration'] as const;
    for (const t of types) {
      const res = await fetch(`${apiBaseUrl}/airdrop/type/${t}`, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) continue;
      const raw: any = await res.json();
      const data = raw?.data ?? raw?.events ?? raw;
      const items: any[] = Array.isArray(data) ? data : [];
      const found = items.find((e: any) => String(e?.id || '') === String(id));
      if (found?.name) return String(found.name);
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const name = await getAirdropNameById(id);
  const title = name ? `${name} | HPP Portal` : 'Airdrop Detail | HPP Portal';
  const description = name
    ? `${name} – Discover, join, and claim this airdrop on the HPP ecosystem.`
    : 'HPP Airdrop detail page';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ['/airdrop_og.jpg'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/airdrop_og.jpg'],
    },
  };
}

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
      }),
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
