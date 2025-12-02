'use client';

import Big from 'big.js';

// Format input for display: add locale commas to integer part, preserve decimals
export function formatDisplayAmount(input: string): string {
  if (input === '') return '';
  if (isNaN(Number(input))) return '0';
  if (input.includes('.')) {
    const parts = input.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    return Number(integerPart).toLocaleString() + (decimalPart ? '.' + decimalPart : '.');
  }
  return Number(input).toLocaleString();
}

// Common percent steps used in UI
export const PERCENTS = [0.25, 0.5, 0.75, 1] as const;

// Compute amount string from balance and percent with given decimals, trimming trailing zeros
export function computePercentAmount(balance: string, percent: number, decimals = 18): string {
  const bal = new Big((balance || '0').replace(/,/g, '') || '0');
  const v = bal.times(percent);
  const str = v.toFixed(decimals);
  return str.replace(/\.?0+$/, '');
}

// Format token balance with thousands separators, flooring to avoid rounding up
export function formatTokenBalance(raw: string, decimals: number = 3): string {
  try {
    const floored = new Big(raw).round(decimals, 0).toString(); // 0 = round down
    const [intPart, fracPart] = floored.split('.');
    const num = Number(`${intPart}.${fracPart ?? ''}`);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  } catch {
    return parseFloat(raw).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }
}

// Human-readable remaining time like "2d 5h 3m 10s"
export function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (sec > 0 || parts.length === 0) parts.push(`${sec}s`);
  return parts.join(' ');
}

// Remaining time as both text and structured parts (useful for UI counters)
export function remainingBreakdown(totalSeconds: number): {
  days: number;
  hours: string;
  minutes: string;
  seconds: string;
  text: string;
} {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.floor(s % 60);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const text = [
    days > 0 ? `${days}d` : '',
    hours > 0 || days > 0 ? `${hours}h` : '',
    minutes > 0 || hours > 0 || days > 0 ? `${minutes}m` : '',
    `${seconds}s`,
  ]
    .filter(Boolean)
    .join(' ');
  return {
    days,
    hours: pad2(hours),
    minutes: pad2(minutes),
    seconds: pad2(seconds),
    text,
  };
}
