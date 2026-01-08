'use client';

import React from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCalcPreRegYes, setCalcWhaleTier } from '@/store/slices';

const WHALE_TIERS = [
  { key: 'T1', label: 'Tier 1' },
  { key: 'T2', label: 'Tier 2' },
  { key: 'T3', label: 'Tier 3' },
  { key: 'T4', label: 'Tier 4' },
  { key: 'T5', label: 'Tier 5' },
  { key: 'T6', label: 'Tier 6' },
];

interface AprCalculatorOptions {
  whaleBoost?: boolean; // true = enabled, false = disabled
  holdAndEarn?: boolean;
  daoParticipation?: boolean;
}

interface AprCalculatorProps {
  options?: Partial<AprCalculatorOptions>;
  showPreRegistrationNote?: boolean; // Show pre-registration bonus APR note
}

const DEFAULT_OPTIONS: AprCalculatorOptions = {
  whaleBoost: true,
  holdAndEarn: false,
  daoParticipation: false,
};

export default function AprCalculator({ options = {}, showPreRegistrationNote = false }: AprCalculatorProps = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const isWhaleBoostEnabled = opts.whaleBoost ?? true;
  const isHoldAndEarnEnabled = opts.holdAndEarn ?? false;
  const isDaoParticipationEnabled = opts.daoParticipation ?? false;
  const dispatch = useAppDispatch();
  // Redux state
  const preRegYes = useAppSelector((state) => state.apr.calcPreRegYes);
  const whaleTier = useAppSelector((state) => state.apr.calcWhaleTier);
  const isAprLoading = useAppSelector((state) => state.apr.aprLoading);
  const apiBaseApr = useAppSelector((state) => state.apr.aprBase);
  const apiBonusApr = useAppSelector((state) => state.apr.aprBonus);
  const apiWhaleCredit = useAppSelector((state) => state.apr.aprWhaleCredit);
  const apiFinalApr = useAppSelector((state) => state.apr.finalAPR);
  const apiHoldCredit = useAppSelector((state) => state.apr.aprHoldCredit);
  const apiDaoCredit = useAppSelector((state) => state.apr.aprDaoCredit);
  // Safe number formatting helper
  const formatNumber = (value: number | undefined | null, decimals: number = 0): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    return value.toFixed(decimals);
  };

  const baseApr = formatNumber(apiBaseApr, 0);
  const bonusApr = formatNumber(apiBonusApr, 0);
  const whaleCredit = formatNumber((apiWhaleCredit || 1) * 100, 0);
  const holdCredit = formatNumber((apiHoldCredit || 1) * 100, 0);
  const daoCredit = formatNumber((apiDaoCredit || 1) * 100, 0);

  // Wrapper function for Dropdown onChange type compatibility
  const handleWhaleTierChange = React.useCallback(
    (v: React.SetStateAction<string>) => {
      const value = typeof v === 'function' ? v(whaleTier) : v;
      dispatch(setCalcWhaleTier(value));
    },
    [whaleTier, dispatch]
  );

  return (
    <div className="mt-5 rounded-[5px] bg-[#121212]">
      <div className="px-5 pt-5 pb-7.5">
        <div className="text-[#BFBFBF] text-base leading-[1.2] tracking-[0.8px] font-semibold mb-4">APR Calculator</div>
        {/* Calculation Formula Display */}
        <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch">
          {/* Base APR */}
          <div className="rounded-[5px] border border-[#2D2D2D] bg-[#0f0f0f] p-5">
            <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0] font-normal text-center mb-2.5">
              Base APR
            </div>
            <div className="flex items-center justify-center text-[#5DF23F] text-base font-normal">
              <span>{isAprLoading ? '...' : `${baseApr}%`}</span>
              <span className="mx-2.5 text-[#bfbfbf] text-base font-normal">+</span>
              <span className="flex items-center gap-1">
                <span className="text-[#5DF23F]">🔥</span>
                <span>{isAprLoading ? '...' : preRegYes === 'yes' && apiBonusApr > 0 ? `${bonusApr}%` : '-%'}</span>
              </span>
            </div>
          </div>

          {/* Multiplication Symbol */}
          <div className="hidden min-[900px]:flex items-center justify-center px-1">
            <span className="text-[#bfbfbf] text-3xl font-normal">×</span>
          </div>
          <div className="flex min-[900px]:hidden items-center justify-center py-1">
            <span className="text-[#bfbfbf] text-3xl font-normal">×</span>
          </div>

          {/* Bonus Credit */}
          <div className="rounded-[8px] border border-[#2D2D2D] p-5">
            <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0] font-normal text-center mb-2.5">
              Bonus Credit
            </div>
            <div className="flex items-center justify-center gap-2 text-[#5DF23F] text-base font-normal flex-wrap">
              <span className="flex items-center gap-1">
                🐳 <span>{isAprLoading ? '...' : `${whaleCredit}%`}</span>
              </span>
              <span className="text-[#bfbfbf] text-base font-normal">×</span>
              <span className="flex items-center gap-1">
                💰{' '}
                <span>
                  {isAprLoading
                    ? '...'
                    : apiHoldCredit && apiHoldCredit > 1
                    ? `${formatNumber(apiHoldCredit * 100, 0)}%`
                    : '-%'}
                </span>
              </span>
              <span className="text-[#bfbfbf] text-base font-normal">×</span>
              <span className="flex items-center gap-1">
                📝{' '}
                <span>
                  {isAprLoading
                    ? '...'
                    : apiDaoCredit && apiDaoCredit > 1
                    ? `${formatNumber(apiDaoCredit * 100, 0)}%`
                    : '-%'}
                </span>
              </span>
            </div>
          </div>

          {/* Equals Symbol */}
          <div className="hidden min-[900px]:flex items-center justify-center px-1">
            <span className="text-[#5DF23F] text-3xl font-normal">=</span>
          </div>
          <div className="flex min-[900px]:hidden items-center justify-center py-1">
            <span className="text-[#5DF23F] text-xl font-semibold">=</span>
          </div>

          {/* Expected APR */}
          <div className="rounded-[8px] border border-[#2D2D2D] p-5">
            <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0] font-normal text-center mb-2.5">
              Expected APR
            </div>
            <div className="flex items-center justify-center gap-2 text-[#5DF23F] text-base font-normal">
              <span>{isAprLoading ? '...' : `${apiFinalApr}%`}</span>
            </div>
          </div>
        </div>

        {/* Options Section */}
        <div className="mt-8 w-full">
          <div className="flex flex-col gap-6 w-full">
            {/* Pre-Registration */}
            <div className="flex items-center justify-between w-full gap-3">
              <span className="text-white text-base leading-[1.5] tracking-[0.8px]">🔥 Pre-Registration</span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-white text-base leading-[1.5] tracking-[0.8px] cursor-pointer">
                  <input
                    type="checkbox"
                    className="hpp-checkbox cursor-pointer"
                    checked={preRegYes === 'yes'}
                    onChange={() => dispatch(setCalcPreRegYes('yes'))}
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-2 text-white text-base leading-[1.5] tracking-[0.8px] cursor-pointer">
                  <input
                    type="checkbox"
                    className="hpp-checkbox cursor-pointer"
                    checked={preRegYes === 'no'}
                    onChange={() => dispatch(setCalcPreRegYes('no'))}
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            {/* Whale Boost */}
            <div className="flex items-center justify-between w-full gap-3">
              <span
                className={`text-base ${
                  isWhaleBoostEnabled
                    ? 'text-white leading-[1.5] tracking-[0.8px]'
                    : 'text-[#2d2d2d] leading-[1] tracking-[0]'
                }`}
              >
                <span className={isWhaleBoostEnabled ? '' : 'opacity-50'}>🐳</span> Whale Boost
              </span>
              <div className="relative z-50">
                <Dropdown
                  value={whaleTier}
                  onChange={handleWhaleTierChange}
                  options={WHALE_TIERS}
                  disabled={!isWhaleBoostEnabled}
                />
              </div>
            </div>

            {/* Hold & Earn */}
            <div className="flex items-center justify-between w-full gap-3">
              <span
                className={`text-base ${
                  isHoldAndEarnEnabled
                    ? 'text-white leading-[1.5] tracking-[0.8px]'
                    : 'text-[#2d2d2d] leading-[1] tracking-[0]'
                }`}
              >
                <span className={isHoldAndEarnEnabled ? '' : 'opacity-50'}>💰</span> Hold & Earn
              </span>
              <span className="text-[#2d2d2d] text-base leading-[1] tracking-[0]">Coming Soon</span>
            </div>

            {/* DAO Participation */}
            <div className="flex items-center justify-between w-full gap-3">
              <span
                className={`text-base ${
                  isDaoParticipationEnabled
                    ? 'text-white leading-[1.5] tracking-[0.8px]'
                    : 'text-[#2d2d2d] leading-[1] tracking-[0]'
                }`}
              >
                <span className={isDaoParticipationEnabled ? '' : 'opacity-50'}>📝</span> DAO Participation
              </span>
              <span className="text-[#2d2d2d] text-base leading-[1] tracking-[0]">Coming Soon</span>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="mt-5">
          <div className="text-[#5DF23F] text-base leading-[1.5] tracking-[0.8px] font-semibold">Important</div>
          <ul className="text-base text-white leading-[1.5] tracking-[0.8px] list-disc pl-5">
            <li>Bonus Credit can increase your APR.</li>
            <li>Your final APR is calculated as (Base APR + Bonus APR) × (Bonus Credit).</li>
            {showPreRegistrationNote && (
              <li>
                The pre-registration bonus APR will continue to be offered until the allocated 1,000,000 HPP pool is
                fully distributed.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
