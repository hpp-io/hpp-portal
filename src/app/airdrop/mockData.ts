// Mock Airdrop Events Data
// This file contains mock data for airdrop events
// In production, this will be replaced with API calls

import React from 'react';
import { HPPTickerIcon } from '@/assets/icons';

export const mockAirdropEventIds = [
  '8aa6defc-3303-4a8b-a4fd-7edf508c78e8', // HPP Genesis Airdrop
  'a1b2c3d4-e5f6-4a8b-a4fd-7edf508c78e9', // HPP Network Launch Airdrop
  'f9e8d7c6-b5a4-4a8b-a4fd-7edf508c78ea', // HPP Protocol Pioneer Airdrop
];

// Types
export type AirdropStatus = 'On-Going' | 'Coming Soon' | 'Ended';

export interface AirdropEvent {
  id: string;
  name: string;
  eventName: string;
  reward: number;
  starts: string;
  ends: string;
  status: AirdropStatus;
  icon: React.ComponentType<{ className?: string }>;
}

export interface AirdropDetail {
  id: string;
  name: string;
  eventName: string;
  reward: number;
  starts: string;
  ends: string;
  status: AirdropStatus;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  claimPeriodStart: string;
  claimPeriodEnd: string;
  vestingPeriodStart: string;
  vestingPeriodEnd: string;
  vestingDuration: string;
  eligibilityDescription: string;
  governanceVoteLink?: string;
  governanceVoteText?: string;
  imageUrl?: string;
}

export const mockAirdropDetails: Record<string, AirdropDetail> = {
  '8aa6defc-3303-4a8b-a4fd-7edf508c78e8': {
    id: '8aa6defc-3303-4a8b-a4fd-7edf508c78e8',
    name: 'HPP Genesis Airdrop',
    eventName: 'HPP',
    reward: 17000000,
    starts: '1/19/26',
    ends: '1/23/26',
    status: 'On-Going',
    icon: HPPTickerIcon,
    description: '17,000,000 HPP tokens are being distributed to community members who participated in the [AIP-21 Governance Vote](https://x.com/aergo_io/status/1907719761439633597).',
    claimPeriodStart: '2026.2.DD, 00:00 UTC',
    claimPeriodEnd: '2027.2.DD, 00:00 UTC',
    vestingPeriodStart: '2025.12.1 UTC',
    vestingPeriodEnd: '2027.12.1 UTC',
    vestingDuration: '24 months',
    eligibilityDescription: 'Connect your AIP-21 voting wallet to check airdrop eligibility.',
  },
  'a1b2c3d4-e5f6-4a8b-a4fd-7edf508c78e9': {
    id: 'a1b2c3d4-e5f6-4a8b-a4fd-7edf508c78e9',
    name: 'HPP Network Launch Airdrop',
    eventName: 'HPP',
    reward: 1200000,
    starts: '1/19/26',
    ends: '-',
    status: 'Coming Soon',
    icon: HPPTickerIcon,
    description: '1,200,000 HPP tokens are being distributed to early network participants.',
    claimPeriodStart: '2026.2.DD, 00:00 UTC',
    claimPeriodEnd: 'TBD',
    vestingPeriodStart: 'TBD',
    vestingPeriodEnd: 'TBD',
    vestingDuration: 'TBD',
    eligibilityDescription: 'Connect your wallet to check airdrop eligibility.',
  },
  'f9e8d7c6-b5a4-4a8b-a4fd-7edf508c78ea': {
    id: 'f9e8d7c6-b5a4-4a8b-a4fd-7edf508c78ea',
    name: 'HPP Protocol Pioneer Airdrop',
    eventName: 'HPP',
    reward: 17000000,
    starts: '1/19/26',
    ends: '1/23/26',
    status: 'Ended',
    icon: HPPTickerIcon,
    description: '17,000,000 HPP tokens were distributed to protocol pioneers.',
    claimPeriodStart: '2026.1.19 UTC',
    claimPeriodEnd: '2026.1.23 UTC',
    vestingPeriodStart: '2025.12.1 UTC',
    vestingPeriodEnd: '2027.12.1 UTC',
    vestingDuration: '24 months',
    eligibilityDescription: 'This airdrop has ended.',
  },
};

// Format reward number to display string (e.g., 17000000 -> "17M HPP Token")
export function formatReward(reward: number): string {
  if (reward >= 1000000) {
    const millions = reward / 1000000;
    // If it's a whole number, don't show decimals
    if (millions % 1 === 0) {
      return `${millions}M HPP Token`;
    }
    return `${millions.toFixed(1)}M HPP Token`;
  } else if (reward >= 1000) {
    const thousands = reward / 1000;
    if (thousands % 1 === 0) {
      return `${thousands}K HPP Token`;
    }
    return `${thousands.toFixed(1)}K HPP Token`;
  }
  return `${reward} HPP Token`;
}

// Generate mockAirdropEvents from mockAirdropDetails
export const mockAirdropEvents: AirdropEvent[] = Object.values(mockAirdropDetails).map((detail) => ({
  id: detail.id,
  name: detail.name,
  eventName: detail.eventName,
  reward: detail.reward,
  starts: detail.starts,
  ends: detail.ends,
  status: detail.status,
  icon: detail.icon,
}));

/**
 * Fetch airdrop event IDs from API at build time
 * Falls back to mock data if API is unavailable
 */
export async function getAirdropEventIds(): Promise<string[]> {
  try {
    // TODO: Replace with actual API endpoint
    const apiUrl = process.env.NEXT_PUBLIC_AIRDROP_API_URL;
    
    if (!apiUrl) {
      console.warn('NEXT_PUBLIC_AIRDROP_API_URL not set, using mock data');
      return mockAirdropEventIds;
    }

    // Example API call (adjust based on your API structure)
    const response = await fetch(`${apiUrl}/airdrop/events`, {
      headers: { accept: 'application/json' },
      // Disable cache for build time
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Adjust based on your API response structure
    // Example: data.events.map((event: any) => event.id)
    // Or: data.map((event: any) => event.id)
    if (Array.isArray(data)) {
      return data.map((event: any) => event.id);
    } else if (data.events && Array.isArray(data.events)) {
      return data.events.map((event: any) => event.id);
    } else if (data.ids && Array.isArray(data.ids)) {
      return data.ids;
    }

    throw new Error('Invalid API response structure');
  } catch (error) {
    console.warn('Failed to fetch airdrop events from API, using mock data:', error);
    return mockAirdropEventIds;
  }
}
