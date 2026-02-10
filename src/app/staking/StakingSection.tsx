'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import WalletButton from '@/components/ui/WalletButton';
import { HPPTickerIcon, StakeIcon, UnstakeIcon, ClaimIcon } from '@/assets/icons';

export default function StakingSection(props: any) {
  const {
    activeTab,
    setActiveTab,
    isConnected,
    hppBalance,
    stakedTotal,
    amount,
    inputError,
    expectedAprDisplay,
    expectedAnnualReward,
    cooldownSeconds,
    isSubmitting,
    isHppBalanceLoading,
    isStakedTotalLoading,
    derivedWithdrawable,
    derivedWithdrawableWei,
    handleAmountChange,
    setPercent,
    setUnstakePercent,
    onStake,
    onUnstake,
    onClaim,
    formatDisplayAmount,
    formatCooldownDuration,
    PERCENTS,
  } = props;

  return (
    <div className="mx-auto w-full">
      {/* Panel */}
      <div className="mt-5 w-full mb-25">
        <div className="rounded-[8px] px-5 py-7.5 bg-[#4b4ab0]">
          {/* Sub-tabs */}
          <div className="w-full mb-5">
            <div className="flex items-center gap-2">
              {(['stake', 'unstake', 'claim'] as const).map((id) => {
                const isActive = activeTab === id;
                const label = id === 'stake' ? 'Stake' : id === 'unstake' ? 'Unstake' : 'Claim';
                const iconClass = [
                  'w-4.5 h-4.5',
                  'fill-current [&_*]:fill-current',
                  isActive ? 'text-black' : 'text-white',
                ].join(' ');
                const leftIcon =
                  id === 'stake' ? (
                    <StakeIcon className={iconClass} />
                  ) : id === 'unstake' ? (
                    <UnstakeIcon className={iconClass} />
                  ) : (
                    <ClaimIcon className={`${iconClass} relative top-[2px]`} />
                  );
                return (
                  <Button
                    key={id}
                    size="sm"
                    variant={isActive ? 'white' : 'black'}
                    className={[
                      '!rounded-full px-4 py-2 text-base font-normal',
                      !isActive ? 'hover:!bg-[#1a1a1a] !text-white' : '!text-black',
                    ].join(' ')}
                    leftIcon={leftIcon}
                    aria-pressed={isActive}
                    onClick={() => setActiveTab(id)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>

          {activeTab === 'stake' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px]">Amount</h3>
                <div className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px]">
                  Balance: {isConnected ? `${hppBalance} HPP` : '- HPP'}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white text-black">
                  <HPPTickerIcon className="w-8 h-8" />
                </span>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="\\d*\\.?\\d*"
                    min="0"
                    className={`w-full bg-transparent outline-none ${
                      inputError ? 'text-[#FF1312]' : 'text-white'
                    } text-[40px] font-semibold leading-[1.2] tracking-[0.8px] placeholder:text-white/60`}
                    value={formatDisplayAmount(amount)}
                    placeholder="0.00"
                    onChange={(e) => handleAmountChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    onWheel={(e) => {
                      (e.target as HTMLInputElement).blur();
                    }}
                  />
                  <span className="absolute top-0 left-0 invisible pointer-events-none whitespace-pre text-[40px] font-semibold leading-[1.2] tracking-[0.8px]">
                    {formatDisplayAmount(amount || '0.00')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 mt-5">
                {PERCENTS.map((p: number) => {
                  const label = p === 1 ? 'Max' : `${Math.round(p * 100)}%`;
                  return (
                    <button
                      key={p}
                      onClick={() => setPercent(p)}
                      className="bg-white text-black rounded-full px-5 py-2 text-base font-normal leading-[1] cursor-pointer transition-opacity duration-200 hover:opacity-90 focus:outline-none focus:ring-0 focus-visible:outline-none focus:shadow-none"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-base text-white leading-[1.2] tracking-[0.8px] font-normal">
                  <span>Total Staked Amount</span>
                  <span>{isConnected ? `${stakedTotal} HPP` : '-'}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 min-[800px]:grid-cols-2 gap-2.5 justify-items-stretch">
                  <div className="w-full rounded-[5px] bg-white/10 p-5 text-center">
                    <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">Expected APR</div>
                    <div className="text-white text-xl leading-[1.2] tracking-[0.8px] font-semibold mt-1">
                      {expectedAprDisplay}
                    </div>
                  </div>
                  <div className="w-full rounded-[5px] bg-white/10 p-5 text-center">
                    <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                      Expected Annual Reward
                    </div>
                    <div className="text-white text-xl leading-[1.2] tracking-[0.8px] font-semibold mt-1">
                      {expectedAnnualReward}
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="text-[#5DF23F] font-semibold">Caution</div>
                  <ul className="text-base text-white leading-[1.5] tracking-[0.8px]">
                    <li>
                      • HPP will be available to withdraw {formatCooldownDuration(cooldownSeconds)} after unstaking.
                    </li>
                    <li>• Your APR and rewards may vary depending on overall participation and ecosystem activity.</li>
                  </ul>
                </div>
              </div>

              <div className="mt-5">
                {!isConnected ? (
                  <div className="w-full flex justify-center">
                    <WalletButton color="black" size="lg" />
                  </div>
                ) : (
                  <Button
                    variant="black"
                    size="lg"
                    disabled={
                      isSubmitting ||
                      isHppBalanceLoading ||
                      !!inputError ||
                      !amount ||
                      amount === '.' ||
                      Number(amount) <= 0
                    }
                    fullWidth
                    className={`${
                      isSubmitting ||
                      isHppBalanceLoading ||
                      !!inputError ||
                      !amount ||
                      amount === '.' ||
                      Number(amount) <= 0
                        ? '!bg-[#9E9E9E] !text-white'
                        : ''
                    } !rounded-[5px] disabled:!opacity-100 disabled:!text-white`}
                    onClick={onStake}
                  >
                    {isSubmitting ? 'Processing...' : inputError ? inputError : 'Stake'}
                  </Button>
                )}
              </div>
            </>
          )}

          {activeTab === 'unstake' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px]">Amount</h3>
                <div className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px]">
                  Balance: {isConnected ? `${stakedTotal} HPP` : '- HPP'}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white text-black">
                  <HPPTickerIcon className="w-8 h-8" />
                </span>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="\\d*\\.?\\d*"
                    min="0"
                    className={`w-full bg-transparent outline-none ${
                      inputError ? 'text-[#FF1312]' : 'text-white'
                    } text-[40px] font-semibold leading-[1.2] tracking-[0.8px] placeholder:text-white/60`}
                    value={formatDisplayAmount(amount)}
                    placeholder="0.00"
                    onChange={(e) => handleAmountChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    onWheel={(e) => {
                      (e.target as HTMLInputElement).blur();
                    }}
                  />
                  <span className="absolute top-0 left-0 invisible pointer-events-none whitespace-pre text-[40px] font-semibold leading-[1.2] tracking-[0.8px]">
                    {formatDisplayAmount(amount || '0.00')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 mt-5">
                {PERCENTS.map((p: number) => {
                  const label = p === 1 ? 'Max' : `${Math.round(p * 100)}%`;
                  return (
                    <button
                      key={p}
                      onClick={() => setUnstakePercent(p)}
                      className="bg-white text-black rounded-full px-5 py-2 text-base font-normal leading-[1] cursor-pointer transition-opacity duration-200 hover:opacity-90 focus:outline-none focus:ring-0 focus-visible:outline-none focus:shadow-none"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <div className="text-[#5DF23F] font-semibold">Caution</div>
                <ul className="text-base text-white leading-[1.5] tracking-[0.8px]">
                  <li>
                    • HPP will be available to withdraw {formatCooldownDuration(cooldownSeconds)} after unstaking.
                  </li>
                  <li>• Your APR and rewards may vary depending on overall participation and ecosystem activity.</li>
                </ul>
              </div>

              <div className="mt-5">
                {!isConnected ? (
                  <div className="w-full flex justify-center">
                    <WalletButton color="black" size="lg" />
                  </div>
                ) : (
                  <Button
                    variant="black"
                    size="lg"
                    disabled={
                      isSubmitting ||
                      isStakedTotalLoading ||
                      !!inputError ||
                      !amount ||
                      amount === '.' ||
                      Number((amount || '0').replace(/,/g, '')) <= 0
                    }
                    fullWidth
                    className={`${
                      isSubmitting ||
                      isStakedTotalLoading ||
                      !!inputError ||
                      !amount ||
                      amount === '.' ||
                      Number((amount || '0').replace(/,/g, '')) <= 0
                        ? '!bg-[#9E9E9E] !text-white'
                        : ''
                    } !rounded-[5px] disabled:!opacity-100 disabled:!text-white`}
                    onClick={onUnstake}
                  >
                    {isSubmitting ? 'Processing...' : 'Unstake'}
                  </Button>
                )}
              </div>
            </>
          )}

          {activeTab === 'claim' && (
            <>
              <div className="flex rounded-[5px] items-center gap-2.5">
                <h3 className="text-white text-base font-normal leading-[1.2] tracking-[0.8px]">Claim Available</h3>
              </div>
              <div className="flex items-center justify-center gap-2.5 mt-4 mb-4">
                <HPPTickerIcon className="w-8 h-8" />
                <span className="text-white text-[40px] font-semibold leading-[1.2] tracking-[0.8px]">
                  {isConnected ? derivedWithdrawable : '-'}
                </span>
              </div>
              <div className="mt-5">
                <div className="text-[#5DF23F] font-semibold">Caution</div>
                <ul className="text-base text-white leading-[1.5] tracking-[0.8px]">
                  <li>
                    • HPP will be available to withdraw {formatCooldownDuration(cooldownSeconds)} after unstaking.
                  </li>
                  <li>• When the cooldown is over, your tokens will be accumulated to ‘Claim Available.’</li>
                  <li>• Your APR and rewards may vary depending on overall participation and ecosystem activity.</li>
                </ul>
              </div>
              <div className="mt-5">
                {!isConnected ? (
                  <div className="w-full flex justify-center">
                    <WalletButton color="black" size="lg" />
                  </div>
                ) : (
                  <Button
                    variant="black"
                    size="lg"
                    fullWidth
                    disabled={isSubmitting || derivedWithdrawableWei <= BigInt(0)}
                    className={`${
                      isSubmitting || derivedWithdrawableWei <= BigInt(0) ? '!bg-[#9E9E9E] !text-white' : ''
                    } !rounded-[5px] disabled:!opacity-100 disabled:!text-white`}
                    onClick={onClaim}
                  >
                    {isSubmitting ? 'Processing...' : 'Claim'}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        {/* Claim history inside parent when activeTab === 'claim' – keep outside or lift if needed */}
      </div>
    </div>
  );
}
