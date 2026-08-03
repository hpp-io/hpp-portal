import type { ComponentType, SVGProps } from 'react';
import type { StaticImageData } from 'next/image';
import { PartyKnightsAirdrop, BooostAirdrop, HPPTickerIcon, BooostCircleIcon } from '@/assets/icons';

/** Keys for detail hero `imageUrl` in `airdrops.ts`. */
export type AirdropHeroImageKey = 'PartyKnightsAirdrop' | 'BooostAirdrop';

/** Keys for list row `icon` in `airdrops.ts`. */
export type AirdropListIconKey = 'HPPTickerIcon' | 'BooostCircleIcon';

const AIRDROP_HERO_IMAGES: Partial<Record<AirdropHeroImageKey, StaticImageData>> = {
  PartyKnightsAirdrop,
  BooostAirdrop,
};

const AIRDROP_LIST_ICONS: Record<AirdropListIconKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  HPPTickerIcon,
  BooostCircleIcon,
};

export function getAirdropHeroImage(value?: string | null): StaticImageData | null {
  if (!value) return null;
  return AIRDROP_HERO_IMAGES[value as AirdropHeroImageKey] ?? null;
}

export function getAirdropListIcon(key?: string | null): ComponentType<SVGProps<SVGSVGElement>> {
  if (key && key in AIRDROP_LIST_ICONS) {
    return AIRDROP_LIST_ICONS[key as AirdropListIconKey];
  }
  return HPPTickerIcon;
}
