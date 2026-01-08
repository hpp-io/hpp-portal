'use client';

import React from 'react';
import { useToast } from '@/hooks/useToast';
import { InfoIcon } from '@/assets/icons';

export default function AprJourneyInfo() {
  const { showToast } = useToast();

  const handleClick = () => {
    showToast(
      'APR Journey',
      <div className="space-y-4">
        {/* Green (Base) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-4 rounded bg-[#5DF240] flex-shrink-0 rounded-[91px]" />
          </div>
          <p className="text-white text-base leading-[1.5] tracking-[0]">
            <span className="text-[#5DF240] font-semibold">Green (Base)</span> is the baseline APR, the floor you earn
            by staking.
          </p>
        </div>

        {/* Blue (Base High) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-4 rounded bg-[#41CFEF] flex-shrink-0 rounded-[91px]" />
          </div>
          <p className="text-white text-base leading-[1.5] tracking-[0]">
            <span className="text-[#41CFEF] font-semibold">Blue (Base High)</span> represents users who stake a large
            amount (Whale Boost). Their APR can rise each season as new boosts unlock (Hold & Earn, DAO Participation).
          </p>
        </div>

        {/* Orange (Pre High) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-4 rounded bg-[#EDA744] flex-shrink-0 rounded-[91px]" />
          </div>
          <p className="text-white text-base leading-[1.5] tracking-[0]">
            <span className="text-[#EDA744] font-semibold">Orange (Pre High)</span> is the highest path: users who
            pre-register and stake a large amount start with a higher APR in Season 1 and can reach the top APR by
            progressing through each season.
          </p>
        </div>
      </div>,
      'custom'
    );
  };

  return <InfoIcon className="w-5 h-5 cursor-pointer" onClick={handleClick} />;
}

