'use client';

import React, { useMemo, useEffect, useCallback } from 'react';
import '@reown/appkit-ui';
import Button from '@/components/ui/Button';
import WalletButton from '@/components/ui/WalletButton';
import { useAccount, useDisconnect } from 'wagmi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setActivityPage,
  setWalletFinalApr,
  setWalletFinalAprLoading,
  setWalletBaseApr,
  setWalletBonusApr,
  setWalletWhaleCredit,
  setWalletHoldCredit,
  setWalletDaoCredit,
} from '@/store/slices';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { formatUnits, parseUnits } from 'viem';
import Big from 'big.js';
import { formatTokenBalance } from '@/lib/helpers';
import axios from 'axios';
import { getHppExplorerTxUrl } from '@/lib/hppExplorer';

type CooldownItem = {
  date: string;
  amount: string;
  cooling: boolean;
};

/** Activity log: compact pagination without skipping interior page numbers. */
function getActivityPaginationItems(total: number, current: number): (number | 'ellipsis')[] {
  if (total <= 1) return [1];
  const siblings = 2;
  /** Show every page when total is small enough to stay one row. */
  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let left = Math.max(2, current - siblings);
  let right = Math.min(total - 1, current + siblings);

  if (current <= siblings + 2) {
    left = 2;
    right = Math.min(total - 1, 2 + siblings * 2 + 2);
  } else if (current >= total - siblings - 1) {
    right = total - 1;
    left = Math.max(2, total - 1 - siblings * 2 - 2);
  }

  const items: (number | 'ellipsis')[] = [1];
  if (left > 2) {
    items.push('ellipsis');
  }
  for (let i = left; i <= right; i++) {
    items.push(i);
  }
  if (right < total - 1) {
    items.push('ellipsis');
  }
  items.push(total);
  return items;
}

export default function DashboardSection() {
  const dispatch = useAppDispatch();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
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

  const activityPaginationItems = useMemo(
    () => getActivityPaginationItems(activityPageCount, activityPage),
    [activityPageCount, activityPage],
  );

  // Derived withdrawable from cooldowns
  const derivedWithdrawableWei = useMemo(() => {
    if (!cooldowns?.length) return BigInt(0);
    return cooldowns.reduce(
      (acc, c) => (c.unlock <= nowSecTick ? acc + (c.amountWei ? BigInt(c.amountWei) : BigInt(0)) : acc),
      BigInt(0),
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
        `${process.env.NEXT_PUBLIC_HPP_STAKING_API_URL}/apr/wallet/${address}?stakedAmount=${stakedAmountWei.toFixed(
          0,
        )}`,
        {
          headers: { accept: 'application/json' },
        },
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
        // Set base APR and bonus APR
        if (typeof d.baseAPR === 'number') dispatch(setWalletBaseApr(d.baseAPR));
        if (typeof d.bonusAPR === 'number') dispatch(setWalletBonusApr(d.bonusAPR));
        // Set credit values for Bonus Credit display
        if (typeof d.whaleBoostCredit === 'number') dispatch(setWalletWhaleCredit(d.whaleBoostCredit));
        const holdNum = Number(d.holdEarnCredit);
        const daoNum = Number(d.daoCredit);
        dispatch(setWalletHoldCredit(Number.isFinite(holdNum) && holdNum > 0 ? holdNum : null));
        dispatch(setWalletDaoCredit(Number.isFinite(daoNum) && daoNum > 0 ? daoNum : null));
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
            <div className="bg-[#121212] px-5 py-7.5 min-[1000px]:row-span-2 border-[#2D2D2D] text-center sm:text-left">
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
              <div className="mt-10 min-[1440px]:mt-15 text-white text-sm leading-[1] tracking-[0]">
                {typeof walletBaseApr === 'number' && typeof walletBonusApr === 'number' ? (
                  <>
                    <span className="block sm:inline">
                      Base APR ({walletBaseApr}% + 🔥{walletBonusApr}%)
                    </span>
                    <span className="block sm:inline text-[#5DF23F] font-bold text-base leading-[1] my-3 sm:my-0 sm:mx-2">
                      ×
                    </span>
                    <span className="block sm:inline">
                      Bonus Credit ({whaleCreditStr} × {holdCreditStr} × {daoCreditStr})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block sm:inline">Base APR (10% + 🔥-%)</span>
                    <span className="block sm:inline text-[#5DF23F] font-bold text-base leading-[1] my-3 sm:my-0 sm:mx-2">
                      ×
                    </span>
                    <span className="block sm:inline">Bonus Credit (🐳-% × 💰-% × 📝-%)</span>
                  </>
                )}
              </div>
            </div>
            {/* Right cards: 1 col on narrow, 2 cols from 640px, then "contents" on wide to preserve 3-col layout */}
            <div className="grid grid-cols-1 min-[640px]:grid-cols-2 min-[1000px]:contents text-center min-[640px]:text-left">
              {/* Row 1 */}
              <div className="bg-[#121212] px-5 py-7.5 border-t border-[#2D2D2D] min-[1000px]:border-t-0 min-[1000px]:border-l">
                <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] font-normal">
                  Total Staked Amount
                </div>
                <div className="mt-2.5 flex items-center justify-center min-[640px]:justify-start gap-2">
                  <span className="text-white text-xl font-normnal leading-[24px] tracking-[0]">
                    {isConnected ? `${stakedTotal} HPP` : '- HPP'}
                  </span>
                </div>
              </div>
              <div className="bg-[#121212] px-5 py-7.5 border-t border-[#2D2D2D] min-[640px]:border-l min-[640px]:border-[#2D2D2D] min-[1000px]:border-t-0 min-[1000px]:border-l">
                <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] font-normal">
                  Expected Annual Reward
                </div>
                <div className="mt-2.5 text-white text-xl font-normal leading-[24px] tracking-[0]">
                  {annualRewardFromStake}
                </div>
              </div>
              {/* Row 2 */}
              <div className="bg-[#121212] px-5 py-7.5 border-t border-[#2D2D2D] min-[1000px]:border-l">
                <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] font-normal">
                  Total Rewards Claimed
                </div>
                <div className="mt-2.5 text-white text-xl font-normal leading-[24px] tracking-[0]">- HPP</div>
              </div>
              <div className="bg-[#121212] px-5 py-7.5 border-t border-[#2D2D2D] min-[640px]:border-l min-[640px]:border-[#2D2D2D] min-[1000px]:border-l">
                <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] font-normal">
                  Unclaimed Reward
                </div>
                <div className="mt-2.5 flex items-center justify-center min-[640px]:justify-start gap-2">
                  <span className="text-white text-xl font-normal leading-[24px] tracking-[0]">
                    {/* {isConnected ? `${derivedWithdrawable} HPP` : '- HPP'} */}- HPP
                  </span>
                </div>
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
          ) : activitiesLoading && (!activities || activities.length === 0 || !activities.some((a) => a.isLocal)) ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4">
                <DotLottieReact src="/lotties/Loading.lottie" autoplay loop style={{ width: 48, height: 48 }} />
              </div>
              <p className="text-base text-[#bfbfbf] tracking-[0.8px] leading-[1.5] text-center font-normal animate-pulse">
                Fetching activities...
              </p>
            </div>
          ) : activities && activities.length > 0 ? (
            <>
              <div className="divide-y divide-[#2D2D2D] pt-3.5">
                {activities
                  .slice(Math.max(0, (activityPage - 1) * 10), Math.max(0, activityPage * 10))
                  .map((tx: { id: string; date: string; action: string; amount?: string; status?: string }) => {
                    const txUrl = getHppExplorerTxUrl(tx.id);
                    return (
                      <div
                        key={tx.id}
                        className="block px-5 py-4 last:border-b last:border-[#2D2D2D] hover:bg-[#1a1a1a] transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px]">{tx.date}</div>
                            <div className="mt-2.5 text-[#25FF21] text-base leading-[1.2] tracking-[0.8px] font-normal">
                              {tx.action}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2 text-white text-sm leading-[1.2] tracking-[0.8px]">
                              <span>
                                {tx.status === 'Pending' ? (
                                  <span className="pending-text">Pending</span>
                                ) : (
                                  tx.status || 'Completed'
                                )}
                              </span>
                              <a
                                href={txUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer hover:opacity-80"
                                aria-label="View transaction on explorer"
                              >
                                <svg
                                  className="w-4 h-4 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            </div>
                            <div className="mt-2.5 text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                              {tx.amount ?? '-'}
                            </div>
                          </div>
                        </div>
                      </div>
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
                      {activityPaginationItems.map((item, idx) =>
                        item === 'ellipsis' ? (
                          <span key={`ellipsis-${idx}`} className="text-[#BFBFBF] select-none" aria-hidden>
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            aria-current={item === activityPage ? 'page' : undefined}
                            className={[
                              'cursor-pointer flex items-center justify-center rounded-full',
                              'w-6 h-6 text-base leading-[1] tracking-[0]',
                              item === activityPage ? 'bg-white text-black' : 'text-[#BFBFBF] hover:text-white',
                            ].join(' ')}
                            onClick={() => dispatch(setActivityPage(item))}
                          >
                            {item}
                          </button>
                        ),
                      )}
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
