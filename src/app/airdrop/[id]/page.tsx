import React, { cache } from 'react';
import type { Metadata } from 'next';
import AirdropDetailClient from './AirdropDetailClient';

const getAirdropNameById = cache(async (id: string): Promise<string | null> => {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_STAKING_API_URL;
    if (!apiBaseUrl) return null;

    // Same as AirdropDetailClient: call type endpoint with ?id= for single-item response
    const types = ['hpp', 'dapp', 'collaboration'] as const;
    for (const t of types) {
      const url = `${apiBaseUrl}/airdrop/type/${t}?id=${encodeURIComponent(id)}`;
      const res = await fetch(url, {
        headers: { accept: 'application/json' },
        next: { revalidate: 60 },
      });
      if (!res.ok) continue;
      const raw: any = await res.json();
      // Match AirdropDetailClient detail parsing: data (array or object), raw array, or raw object
      let detailData: any = null;
      if (raw?.data !== undefined) {
        detailData = Array.isArray(raw.data) ? (raw.data[0] ?? null) : raw.data;
      } else if (Array.isArray(raw)) {
        detailData = raw[0] ?? null;
      } else if (raw && typeof raw === 'object') {
        detailData = raw;
      }
      const name = detailData?.name ?? detailData?.eventName;
      if (name) return String(name);
    }
    return null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
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
        let items: any[] = [];
        if (Array.isArray(raw)) items = raw;
        else if (Array.isArray(raw?.data)) items = raw.data;
        else if (Array.isArray(raw?.events)) items = raw.events;
        return items.map((e) => String(e?.id ?? '')).filter(Boolean);
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
