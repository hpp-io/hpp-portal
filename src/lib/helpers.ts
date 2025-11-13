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


