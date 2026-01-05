'use client';

import React, { useMemo, useEffect, useCallback } from 'react';
import '@reown/appkit-ui';
import Button from '@/components/ui/Button';
import WalletButton from '@/components/ui/WalletButton';
import { useAccount, useDisconnect } from 'wagmi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActivityPage, setWalletFinalApr, setWalletFinalAprLoading } from '@/store/slices';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { formatUnits, parseUnits } from 'viem';
import Big from 'big.js';
import { formatTokenBalance } from '@/lib/helpers';
import axios from 'axios';
import { useHppChain } from './hppClient';

type CooldownItem = {
  date: string;
  amount: string;
  cooling: boolean;
};

export default function DashboardSection() {
  const dispatch = useAppDispatch();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { id: HPP_CHAIN_ID } = useHppChain();

  // Redux state
  const stakedTotal = useAppSelector((state) => state.balance.stakedTotal);
  const walletBaseApr = useAppSelector((state) => state.wallet.walletBaseApr);
  const walletBonusApr = useAppSelector((state) => state.wallet.walletBonusApr);
  const walletWhaleCredit = useAppSelector((state) => state.wallet.walletWhaleCredit);
  const walletHoldCredit = useAppSelector((state) => state.wallet.walletHoldCredit);
  const walletDaoCredit = useAppSelector((state) => state.wallet.walletDaoCredit);
  const walletStakedAmountDisplay = useAppSelector((state) => state.wallet.walletStakedAmountDisplay);
  const walletFinalApr = useAppSelector((state) => state.wallet.walletFinalApr);
  const walletFinalAprLoading = useAppSelector((state) => state.wallet.walletFinalAprLoading);
  const finalAPR = useAppSelector((state) => state.apr.finalAPR);
  const activities = useAppSelector((state) => state.activities.activities);
  const activitiesLoading = useAppSelector((state) => state.activities.activitiesLoading);
  const activityPage = useAppSelector((state) => state.activities.activityPage);
  const cooldowns = useAppSelector((state) => state.cooldown.cooldowns);
  const nowSecTick = useAppSelector((state) => state.cooldown.nowSecTick);

  // Computed values
  const shortAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 11)}...${address.slice(-9)}`;
  }, [address]);

  const activityPageCount = useMemo(() => Math.max(1, Math.ceil((activities?.length || 0) / 10)), [activities]);

  // Derived withdrawable from cooldowns
  const derivedWithdrawableWei = useMemo(() => {
    if (!cooldowns?.length) return BigInt(0);
    return cooldowns.reduce(
      (acc, c) => (c.unlock <= nowSecTick ? acc + (c.amountWei ? BigInt(c.amountWei) : BigInt(0)) : acc),
      BigInt(0)
    );
  }, [cooldowns, nowSecTick]);

  const derivedWithdrawable = useMemo(() => {
    const val = formatUnits(derivedWithdrawableWei, 18);
    try {
      const v = new Big(val);
      if (v.gt(0) && v.lt(new Big('0.01'))) {
        return '≈0.01';
      }
    } catch {}
    return formatTokenBalance(val, 2);
  }, [derivedWithdrawableWei]);

  // Fetch wallet Expected APR based on current staked amount
  const fetchWalletExpectedApr = useCallback(async () => {
    if (!isConnected || !address) {
      dispatch(setWalletFinalApr(null));
      dispatch(setWalletFinalAprLoading(false));
      return;
    }
    try {
      // Set loading state
      dispatch(setWalletFinalAprLoading(true));
      // Get current staked amount and convert to Wei (even if 0, we still call API)
      const stakedAmountStr = (stakedTotal || '0').replace(/,/g, '') || '0';
      const stakedAmount = new Big(stakedAmountStr);
      // Ensure it doesn't go below 0
      const finalStakedAmount = stakedAmount.lt(0) ? new Big(0) : stakedAmount;
      // Convert to Wei (18 decimals) for API request
      const stakedAmountWei = finalStakedAmount.times(new Big(10).pow(18));
      const resp = await axios.get(
        `https://hpp-stake-stats-dev.hpp.io/api/apr/wallet/${address}?stakedAmount=${stakedAmountWei.toFixed(0)}`,
        {
          headers: { accept: 'application/json' },
        }
      );
      const data: any = resp?.data ?? {};
      const d = data?.data ?? {};
      if (data?.success && d) {
        // Use finalAPR if available, otherwise use totalAPR
        if (typeof d.finalAPR === 'number') {
          dispatch(setWalletFinalApr(d.finalAPR));
        } else if (typeof d.totalAPR === 'number') {
          dispatch(setWalletFinalApr(d.totalAPR));
        } else {
          dispatch(setWalletFinalApr(null));
        }
      } else {
        dispatch(setWalletFinalApr(null));
      }
    } catch {
      dispatch(setWalletFinalApr(null));
    } finally {
      dispatch(setWalletFinalAprLoading(false));
    }
  }, [isConnected, address, stakedTotal, dispatch]);

  // Fetch Expected APR when stakedTotal changes
  useEffect(() => {
    fetchWalletExpectedApr();
  }, [fetchWalletExpectedApr]);

  // Format APR: show decimal only if it exists, otherwise show integer
  const formatApr = useCallback((apr: number) => {
    const rounded = Math.round(apr * 10) / 10; // Round to 1 decimal place
    if (rounded % 1 === 0) {
      return `${Math.round(rounded)}`;
    }
    return rounded.toFixed(1);
  }, []);

  // Expected APR display - use walletFinalApr if available, only use finalAPR as fallback if not loading
  const expectedAprDisplay = useMemo(() => {
    // Show loading state
    if (walletFinalAprLoading) {
      return null; // Will show spinner in UI
    }
    // Use walletFinalApr if available
    if (Number.isFinite(walletFinalApr) && walletFinalApr !== null && walletFinalApr > 0) {
      return `≈${formatApr(walletFinalApr)}%`;
    }
    // Only use finalAPR as fallback if walletFinalApr has been fetched (is null, not loading)
    // This prevents showing APR Calculator's value before API call completes
    if (walletFinalApr === null && Number.isFinite(finalAPR) && finalAPR > 0) {
      return `≈${formatApr(finalAPR)}%`;
    }
    return '≈10%';
  }, [walletFinalApr, walletFinalAprLoading, finalAPR, formatApr]);

  // Annual reward from stake - use walletFinalApr if available
  const annualRewardFromStake = useMemo(() => {
    if (!isConnected) return '- HPP';
    try {
      const amt = new Big((stakedTotal || '0').replace(/,/g, '') || '0');
      const aprToUse = Number.isFinite(walletFinalApr) && walletFinalApr !== null ? walletFinalApr : finalAPR;
      const reward = amt.times(aprToUse).div(100);
      const decimals = reward.gte(1000) ? 0 : 2;
      return `${formatTokenBalance(reward.toString(), decimals)} HPP`;
    } catch {
      return '- HPP';
    }
  }, [isConnected, stakedTotal, walletFinalApr, finalAPR]);
  const avatarRef = React.useRef<any>(null);
  // TODO: In the future, if API provides per-source credits (e.g., 🐳/💰/📝),
  // compute and display something like "× Bonus Credit (🐳X% × 💰Y% × 📝Z%)".
  const whaleCreditStr = React.useMemo(() => {
    if (typeof walletWhaleCredit === 'number' && Number.isFinite(walletWhaleCredit)) {
      return `🐳${Math.round(walletWhaleCredit * 100)}%`;
    }
    return '🐳-%';
  }, [walletWhaleCredit]);
  const holdCreditStr = React.useMemo(() => {
    if (typeof walletHoldCredit === 'number' && Number.isFinite(walletHoldCredit)) {
      return `💰${Math.round(walletHoldCredit * 100)}%`;
    }
    return '💰-%';
  }, [walletHoldCredit]);
  const daoCreditStr = React.useMemo(() => {
    if (typeof walletDaoCredit === 'number' && Number.isFinite(walletDaoCredit)) {
      return `📝${Math.round(walletDaoCredit * 100)}%`;
    }
    return '📝-%';
  }, [walletDaoCredit]);
  React.useEffect(() => {
    if (avatarRef.current && address) {
      avatarRef.current.address = address;
      avatarRef.current.setAttribute('address', address);
    }
  }, [address]);

  return (
    <div className="mx-auto w-full">
      {/* Top banner */}
      <div className="mt-5 w-full mb-5">
        <div className="rounded-[8px] px-5 py-7.5 bg-[#4b4ab0]">
          {!isConnected ? (
            <div className="w-full flex justify-center">
              <WalletButton color="black" size="lg" />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-full overflow-hidden bg-black">
                  {React.createElement('wui-avatar', { ref: avatarRef, address })}
                </span>
                <div className="flex flex-col">
                  <span className="text-white text-base font-semibold leading-[1.5] tracking-[0.8px]">Account</span>
                  <span className="text-white text-sm leading-[1.5] tracking-[0.8px]">{shortAddress}</span>
                </div>
              </div>
              <Button variant="black" size="lg" onClick={() => disconnect()}>
                Disconnect
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="w-full mb-5">
        <div className="rounded-[8px] border border-[#2D2D2D] overflow-hidden">
          <div className="grid grid-cols-1 min-[1000px]:grid-cols-[2fr_1fr_1fr] gap-0">
            {/* Expected APR (spans 2 rows on wide) */}
            <div className="bg-[#121212] px-5 py-7.5 min-[1000px]:row-span-2 border-[#2D2D2D]">
              <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] font-normal">
                Your Expected APR
              </div>
              <div className="mt-2.5 text-[60px] leading-[64px] tracking-[0] font-semibold text-[#5DF23F]">
                {isConnected ? (
                  walletFinalAprLoading ? (
                    <div className="flex items-center justify-center">
                      <DotLottieReact src="/lotties/Loading.lottie" autoplay loop style={{ width: 48, height: 48 }} />
                    </div>
                  ) : (
                    expectedAprDisplay
                  )
                ) : (
                  '10%+'
                )}
              </div>
              <div className="mt-15 text-white text-sm leading-[1] tracking-[0]">
                {typeof walletBaseApr === 'number' && typeof walletBonusApr === 'number' ? (
                  <>
                    Base APR ({walletBaseApr}% + 🔥{walletBonusApr}%)
                    <span className="text-[#5DF23F] font-bold text-base"> × </span>
                    <span>
                      Bonus Credit ({whaleCreditStr} × {holdCreditStr} × {daoCreditStr})
                    </span>
                  </>
                ) : (
                  <>
                    Base APR (10% + 🔥-%) <span className="text-[#5DF23F]">×</span> Bonus Credit (🐳-% × 💰-% × 📝-%)
                  </>
                )}
              </div>
            </div>
            {/* Right top row */}
            <div className="bg-[#121212] px-5 py-7.5 border-t border-[#2D2D2D] min-[1000px]:border-t-0 min-[1000px]:border-l">
              <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] font-normal">
                Total Staked Amount
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-white text-xl font-normnal leading-[24px] tracking-[0]">
                  {isConnected ? stakedTotal : '- HPP'}
                </span>
              </div>
            </div>
            <div className="bg-[#121212] px-5 py-7.5 border-t border-[#2D2D2D] min-[1000px]:border-t-0 min-[1000px]:border-l">
              <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] font-normal">
                Expected Annual Reward
              </div>
              <div className="mt-2.5 text-white text-xl font-normal leading-[24px] tracking-[0]">
                {annualRewardFromStake}
              </div>
            </div>
            {/* Right bottom row */}
            <div className="bg-[#121212] px-5 py-7.5 border-t border-[#2D2D2D] min-[1000px]:border-l">
              <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] font-normal">
                Total Rewards Claimed
              </div>
              <div className="mt-2.5 text-white text-xl font-normal leading-[24px] tracking-[0]">- HPP</div>
            </div>
            <div className="bg-[#121212] px-5 py-7.5 border-t border-[#2D2D2D] min-[1000px]:border-l">
              <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] font-normal">
                Unclaimed Reward
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-white text-xl font-normal leading-[24px] tracking-[0]">
                  {isConnected ? `${derivedWithdrawable} HPP` : '- HPP'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="w-full mb-25">
        <div className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px] mb-2.5">Activity Log</div>
        <div className="rounded-[5px] bg-[#121212]">
          {!isConnected ? (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px]">
                Connect your wallet to view activity.
              </p>
            </div>
          ) : activities && activities.length > 0 ? (
            <>
              <div className="divide-y divide-[#2D2D2D] pt-3.5">
                {activities
                  .slice(Math.max(0, (activityPage - 1) * 10), Math.max(0, activityPage * 10))
                  .map((tx: { id: string; date: string; action: string; amount?: string; status?: string }) => {
                    const explorerBase =
                      HPP_CHAIN_ID === 190415 ? 'https://explorer.hpp.io' : 'https://sepolia-explorer.hpp.io';
                    const txUrl = `${explorerBase}/tx/${tx.id}`;
                    return (
                      <a
                        key={tx.id}
                        href={txUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-5 py-4 last:border-b last:border-[#2D2D2D] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px]">{tx.date}</div>
                            <div className="mt-2.5 text-[#25FF21] text-base leading-[1.2] tracking-[0.8px] font-normal">
                              {tx.action}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-white text-sm leading-[1.2] tracking-[0.8px]`}>
                              {tx.status === 'Pending' ? (
                                <span className="pending-text">Pending</span>
                              ) : (
                                tx.status || 'Completed'
                              )}
                            </div>
                            <div className="mt-2.5 text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                              {tx.amount ?? '-'}
                            </div>
                          </div>
                        </div>
                      </a>
                    );
                  })}
              </div>
              {activityPageCount > 1 && (
                <div className="flex items-center justify-center pt-4 pb-7.5">
                  <div className="flex items-center gap-4.5">
                    <button
                      aria-label="Previous page"
                      className="cursor-pointer text-white hover:opacity-80 disabled:opacity-30 disabled:cursor-default"
                      onClick={() => dispatch(setActivityPage(Math.max(1, activityPage - 1)))}
                      disabled={activityPage <= 1}
                    >
                      ◀
                    </button>
                    <div className="flex items-center gap-4.5">
                      {(() => {
                        // Mobile: show max 5 pages around current page
                        // Desktop: show all pages
                        const pages: (number | string)[] = [];
                        const maxMobilePages = 5;
                        const showAll = activityPageCount <= maxMobilePages;

                        if (showAll) {
                          // Show all pages if total pages <= 5
                          for (let i = 1; i <= activityPageCount; i++) {
                            pages.push(i);
                          }
                        } else {
                          // Mobile: show max 5 pages, Desktop: show all
                          // For mobile, show current page and 2 pages on each side
                          let startPage = Math.max(1, activityPage - 2);
                          let endPage = Math.min(activityPageCount, startPage + maxMobilePages - 1);

                          // Adjust if we're near the end
                          if (endPage - startPage < maxMobilePages - 1) {
                            startPage = Math.max(1, endPage - maxMobilePages + 1);
                          }

                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(i);
                          }
                        }

                        return (
                          <>
                            {/* Desktop: show all pages */}
                            <div className="hidden min-[640px]:flex items-center gap-4.5">
                              {Array.from({ length: activityPageCount }).map((_, i) => {
                                const n = i + 1;
                                const active = n === activityPage;
                                return (
                                  <button
                                    key={n}
                                    aria-current={active ? 'page' : undefined}
                                    className={[
                                      'cursor-pointer flex items-center justify-center rounded-full',
                                      'w-6 h-6 text-base leading-[1] tracking-[0]',
                                      active ? 'bg-white text-black' : 'text-[#BFBFBF] hover:text-white',
                                    ].join(' ')}
                                    onClick={() => dispatch(setActivityPage(n))}
                                  >
                                    {n}
                                  </button>
                                );
                              })}
                            </div>
                            {/* Mobile: show max 5 pages */}
                            <div className="flex min-[640px]:hidden items-center gap-4.5">
                              {pages.map((page, idx) => {
                                if (typeof page === 'string') {
                                  return (
                                    <span key={`ellipsis-${idx}`} className="text-[#BFBFBF]">
                                      ...
                                    </span>
                                  );
                                }
                                const active = page === activityPage;
                                return (
                                  <button
                                    key={page}
                                    aria-current={active ? 'page' : undefined}
                                    className={[
                                      'cursor-pointer flex items-center justify-center rounded-full',
                                      'w-6 h-6 text-base leading-[1] tracking-[0]',
                                      active ? 'bg-white text-black' : 'text-[#BFBFBF] hover:text-white',
                                    ].join(' ')}
                                    onClick={() => dispatch(setActivityPage(page))}
                                  >
                                    {page}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <button
                      aria-label="Next page"
                      className="cursor-pointer text-white hover:opacity-80 disabled:opacity-30 disabled:cursor-default"
                      onClick={() => dispatch(setActivityPage(Math.min(activityPageCount, activityPage + 1)))}
                      disabled={activityPage >= activityPageCount}
                    >
                      ▶
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-[120px] flex items-center justify-center">
              <p className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px]">No recent activity.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
