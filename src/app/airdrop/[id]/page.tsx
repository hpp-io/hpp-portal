import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AirdropDetailClient from './AirdropDetailClient';
import AirdropPartyKnightsDetailClient from './AirdropPartyKnightsDetailClient';
import AirdropBooostDetailClient from './AirdropBooostDetailClient';
import AirdropLegacyRedirect from './AirdropLegacyRedirect';
import {
  getAllStaticAirdropRouteParams,
  getAirdropPath,
  getStaticAirdropByRouteParam,
  isLegacyAirdropRoute,
} from '@/config/airdrops';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: routeParam } = await params;
  const event = getStaticAirdropByRouteParam(routeParam);
  const name = event?.name ?? event?.eventName ?? null;
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
  return getAllStaticAirdropRouteParams().map((id) => ({ id }));
}

export default async function AirdropDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeParam } = await params;
  const event = getStaticAirdropByRouteParam(routeParam);
  if (!event) notFound();

  if (isLegacyAirdropRoute(routeParam, event)) {
    return <AirdropLegacyRedirect to={getAirdropPath(event)} />;
  }

  if (event.id.startsWith('hpp-party-knights-')) {
    return <AirdropPartyKnightsDetailClient id={event.id} />;
  }

  if (event.id.startsWith('hpp-booost-')) {
    return <AirdropBooostDetailClient id={event.id} />;
  }

  return <AirdropDetailClient id={event.id} />;
}
