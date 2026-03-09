'use client';

import React, { useMemo, useEffect, useCallback } from 'react';
import '@reown/appkit-ui';
import Button from '@/components/ui/Button';
import Dropdown, { type Option } from '@/components/ui/Dropdown';
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
import { useHppChain } from './hppClient';

type CooldownItem = {
  date: string;
  amount: string;
  cooling: boolean;
};

type LeaderboardItem = {
  rank: number;
  address: string;
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Iron';
};

const MOCK_XP_SUMMARY = {
  rank: 56,
  seasonXp: 3000,
  forumXp: 1000,
  votingXp: 1000,
  tier: 'Iron' as const,
  daoBonusRewardXp: 10_000_000,
};

const MOCK_LEADERBOARD: LeaderboardItem[] = [
  { rank: 1, address: '0x582d2936b...e4e8bc302', tier: 'Platinum' },
  { rank: 2, address: '0x582d2936b...e4e8bc302', tier: 'Platinum' },
  { rank: 3, address: '0x582d2936b...e4e8bc302', tier: 'Platinum' },
  { rank: 4, address: '0x582d2936b...e4e8bc302', tier: 'Platinum' },
  { rank: 5, address: '0x582d2936b...e4e8bc302', tier: 'Platinum' },
  { rank: 6, address: '0x582d2936b...e4e8bc302', tier: 'Platinum' },
  { rank: 7, address: '0x582d2936b...e4e8bc302', tier: 'Gold' },
  { rank: 8, address: '0x582d2936b...e4e8bc302', tier: 'Silver' },
  { rank: 9, address: '0x582d2936b...e4e8bc302', tier: 'Bronze' },
  { rank: 10, address: '0x582d2936b...e4e8bc302', tier: 'Iron' },
];

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

  // Local UI state (email connection & tabs)
  const [isEmailConnected, setIsEmailConnected] = React.useState(false);
  const [connectedEmail, setConnectedEmail] = React.useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');
  const [emailStep, setEmailStep] = React.useState<'input' | 'verify'>('input');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = React.useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = React.useState(false);
  const [xpTab, setXpTab] = React.useState<'activity' | 'leaderboard'>('activity');
  const [xpSeason, setXpSeason] = React.useState('season-1');

  const xpSeasonOptions: Option[] = React.useMemo(
    () => [
      // TODO: Replace with API-driven season list
      { key: 'season-1', label: 'Season 1' },
      { key: 'season-2', label: 'Season 2' },
      { key: 'season-3', label: 'Season 3' },
    ],
    [],
  );
  const xpSeasonLabel = useMemo(
    () => xpSeasonOptions.find((o) => o.key === xpSeason)?.label ?? 'Season 1',
    [xpSeasonOptions, xpSeason],
  );

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
        const holdC = d.holdCredit ?? d.holdBoostCredit ?? d.holdAPR ?? null;
        const daoC = d.daoCredit ?? d.daoBoostCredit ?? d.governanceCredit ?? null;
        dispatch(setWalletHoldCredit(typeof holdC === 'number' ? (holdC as number) : null));
        dispatch(setWalletDaoCredit(typeof daoC === 'number' ? (daoC as number) : null));
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

  // Reset email connection state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setIsEmailConnected(false);
      setConnectedEmail(null);
      setXpTab('activity');
    }
  }, [isConnected]);

  const handleOpenEmailModal = () => {
    if (!isConnected) return;
    setEmail('');
    setVerificationCode('');
    setEmailError(null);
    setEmailStep('input');
    setIsEmailModalOpen(true);
  };

  const handleCloseEmailModal = () => {
    if (isSendingCode || isVerifyingCode) return;
    setIsEmailModalOpen(false);
  };

  const handleSendVerificationCode = async () => {
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError(null);
    setIsSendingCode(true);
    try {
      // TODO: Send verification code to the email via staking dashboard API
      await new Promise((resolve) => setTimeout(resolve, 500));
      setEmailStep('verify');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      setEmailError('Please enter the verification code.');
      return;
    }
    setEmailError(null);
    setIsVerifyingCode(true);
    try {
      // TODO: Verify email with the backend and persist connection state
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsEmailConnected(true);
      setConnectedEmail(email.trim());
      setXpTab('activity');
      setIsEmailModalOpen(false);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  return (
    <div className="mx-auto w-full">
      {/* Top banner & XP connect */}
      <div className="mt-5 w-full mb-5 space-y-3.5">
        <div className="flex flex-col min-[1024px]:flex-row gap-3">
          <div className="flex-1 rounded-[8px] px-5 py-7.5 bg-[#4b4ab0]">
            {!isConnected ? (
              <div className="w-full flex justify-center">
                <WalletButton color="black" size="lg" />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-full overflow-hidden bg-black">
                    {React.createElement('wui-avatar', { ref: avatarRef, address })}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-base font-semibold leading-[1.5] tracking-[0.8px]">
                        Account
                        {isEmailConnected && connectedEmail ? ` (${connectedEmail})` : ''}
                      </span>
                      {isEmailConnected && (
                        <button
                          type="button"
                          onClick={handleOpenEmailModal}
                          className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-black hover:bg-[#f5f5f5]"
                        >
                          Change
                        </button>
                      )}
                    </div>
                    <span className="text-white text-sm leading-[1.5] tracking-[0.8px]">{shortAddress}</span>
                  </div>
                </div>
                <Button variant="black" size="lg" onClick={() => disconnect()}>
                  Disconnect
                </Button>
              </div>
            )}
          </div>
          {isConnected && isEmailConnected && (
            <div className="w-full min-[1024px]:w-[260px] rounded-[8px] bg-[#121212] px-4 py-3 flex flex-col justify-center">
              <div className="flex items-center gap-3">
                {/* Left: Tier badge tile */}
                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-[4px] bg-black">
                  <span className="mt-1 text-xs text-white leading-[1.2] tracking-[0.8px]">{MOCK_XP_SUMMARY.tier}</span>
                </div>
                {/* Right: Label + amount */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[#bfbfbf] text-xs leading-[1.5] tracking-[0.8px]">DAO Bonus Reward</span>
                    <button
                      type="button"
                      className="flex items-center justify-center w-4 h-4 rounded-full border border-[#bfbfbf] text-[10px] text-[#bfbfbf] leading-none"
                      aria-label="More info about DAO bonus reward"
                    >
                      ?
                    </button>
                  </div>
                  <span className="mt-1 text-[#5DF23F] text-base font-semibold leading-[1.2]">
                    {MOCK_XP_SUMMARY.daoBonusRewardXp.toLocaleString()} XP
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {isConnected && !isEmailConnected && (
          <div className="rounded-[8px] px-5 py-5 bg-[#121212] flex flex-col min-[768px]:flex-row min-[768px]:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#5DF23F] text-black text-sm font-bold">
                XP
              </div>
              <div className="flex flex-col">
                <span className="text-white text-base font-semibold leading-[1.5] tracking-[0.8px]">XP</span>
                <span className="text-[#bfbfbf] text-sm leading-[1.5] tracking-[0.8px]">
                  Earn XP through DAO activities and unlock additional rewards.
                </span>
              </div>
            </div>
            <Button
              variant="black"
              size="md"
              className="min-w-[150px] self-start min-[768px]:self-auto"
              onClick={handleOpenEmailModal}
            >
              Connect Email
            </Button>
          </div>
        )}
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

      {/* XP summary row (only when email is connected) */}
      {isEmailConnected && (
        <div className="w-full mb-5">
          <div className="rounded-[8px] border border-[#2D2D2D]">
            <div className="grid grid-cols-1 min-[800px]:grid-cols-4 gap-0">
              {/* Your Rank */}
              <div className="bg-[#121212] px-5 py-4 border-t border-[#2D2D2D] min-[800px]:border-t-0 rounded-t-[8px] min-[800px]:rounded-none min-[800px]:rounded-l-[8px]">
                <div className="flex flex-col items-start gap-1">
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8]">Your Rank</span>
                    <Dropdown value={xpSeason} onChange={setXpSeason} options={xpSeasonOptions} />
                  </div>
                  <span className="text-[#5DF23F] text-3xl font-semibold leading-[34px] tracking-[0]">
                    {MOCK_XP_SUMMARY.rank}
                  </span>
                </div>
              </div>
              {/* Season XP Total + selector */}
              <div className="bg-[#121212] px-5 py-4 border-t border-[#2D2D2D] min-[800px]:border-t-0 min-[800px]:border-l">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8]">
                    {xpSeasonLabel} XP Total
                  </span>
                  <span className="text-[#5DF23F] text-3xl font-semibold leading-[34px] tracking-[0]">
                    {MOCK_XP_SUMMARY.seasonXp.toLocaleString()} XP
                  </span>
                </div>
              </div>
              {/* Forum XP */}
              <div className="bg-[#121212] px-5 py-4 border-t border-[#2D2D2D] min-[800px]:border-t-0 min-[800px]:border-l">
                <div className="flex flex-col items-start gap-2">
                  <span className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8]">Forum XP</span>
                  <span className="text-white text-xl font-normal leading-[24px] tracking-[0]">
                    {MOCK_XP_SUMMARY.forumXp.toLocaleString()} XP
                  </span>
                </div>
              </div>
              {/* Voting XP */}
              <div className="bg-[#121212] px-5 py-4 border-t border-[#2D2D2D] min-[800px]:border-t-0 min-[800px]:border-l rounded-b-[8px] min-[800px]:rounded-none min-[800px]:rounded-r-[8px]">
                <div className="flex flex-col items-start gap-2">
                  <span className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8]">Voting XP</span>
                  <span className="text-white text-xl font-normal leading-[24px] tracking-[0]">
                    {MOCK_XP_SUMMARY.votingXp.toLocaleString()} XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log / XP Leaderboard */}
      <div className="w-full mb-25">
        {isEmailConnected ? (
          <div className="flex items-center gap-2.5 mb-2.5">
            <button
              type="button"
              className={[
                'cursor-pointer px-4 py-1.5 rounded-full text-sm font-semibold',
                xpTab === 'activity' ? 'bg-white text-black' : 'bg-[#121212] text-white hover:bg-[#1a1a1a]',
              ].join(' ')}
              onClick={() => setXpTab('activity')}
            >
              Activity Log
            </button>
            <button
              type="button"
              className={[
                'cursor-pointer px-4 py-1.5 rounded-full text-sm font-semibold',
                xpTab === 'leaderboard' ? 'bg-white text-black' : 'bg-[#121212] text-white hover:bg-[#1a1a1a]',
              ].join(' ')}
              onClick={() => setXpTab('leaderboard')}
            >
              XP Leaderboard
            </button>
          </div>
        ) : (
          <div className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px] mb-2.5">Activity Log</div>
        )}
        <div className="rounded-[5px] bg-[#121212]">
          {xpTab === 'leaderboard' && isEmailConnected ? (
            <div className="w-full">
              <div className="flex items-center justify-end px-5 py-3 border-b border-[#2D2D2D]">
                <div className="text-[#bfbfbf] text-xs leading-[1.5] tracking-[0.8px]">
                  Updated Every 08:00/16:00/00:00 UTC
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex px-5 py-3 border-b border-[#2D2D2D] text-sm text-[#bfbfbf] bg-[#1a1a1a]">
                    <div className="w-20">Rank</div>
                    <div className="flex-1">User Address</div>
                    <div className="w-28 text-right">Tier</div>
                  </div>
                  {MOCK_LEADERBOARD.map((row) => (
                    <div
                      key={row.rank}
                      className="flex px-5 py-3 border-b border-[#2D2D2D] last:border-b-0 text-sm text-white hover:bg-[#1a1a1a]"
                    >
                      <div className="w-20">{row.rank}</div>
                      <div className="flex-1 flex items-center gap-2">
                        <span>{row.address}</span>
                        <span className="inline-flex items-center justify-center w-4 h-4 text-[#bfbfbf]">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </span>
                      </div>
                      <div className="w-28 flex items-center justify-end gap-2">
                        <span
                          className={[
                            'inline-flex h-2.5 w-2.5 rounded-[2px]',
                            row.tier === 'Platinum'
                              ? 'bg-[#B86CFF]'
                              : row.tier === 'Gold'
                                ? 'bg-[#FF5A87]'
                                : row.tier === 'Silver'
                                  ? 'bg-[#5DE1FF]'
                                  : row.tier === 'Bronze'
                                    ? 'bg-[#4FA6FF]'
                                    : 'bg-[#FFFFFF]',
                          ].join(' ')}
                        />
                        <span className="text-xs text-white">{row.tier}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center pt-4 pb-7.5">
                <div className="flex items-center gap-4.5">
                  <button
                    aria-label="Previous page"
                    type="button"
                    className="cursor-default text-white opacity-30"
                    disabled
                  >
                    ◀
                  </button>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={[
                          'w-6 h-6 flex items-center justify-center rounded-full text-base leading-[1] tracking-[0]',
                          n === 1 ? 'bg-white text-black' : 'text-[#BFBFBF]',
                        ].join(' ')}
                        disabled
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    aria-label="Next page"
                    type="button"
                    className="cursor-default text-white opacity-30"
                    disabled
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>
          ) : !isConnected ? (
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
                    const explorerBase =
                      HPP_CHAIN_ID === 190415 ? 'https://explorer.hpp.io' : 'https://sepolia-explorer.hpp.io';
                    const txUrl = `${explorerBase}/tx/${tx.id}`;
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
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-[8px] bg-[#121212] border border-[#2D2D2D] px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-semibold leading-[1.2] tracking-[0.8px]">Connect Email</h2>
              <button
                type="button"
                onClick={handleCloseEmailModal}
                className="text-[#bfbfbf] hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-[#bfbfbf] leading-[1.5] tracking-[0.8px] mb-4">
              Enter your email address to receive a verification code.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#bfbfbf] mb-1 tracking-[0.08em] uppercase">Email</label>
                <input
                  type="email"
                  className="w-full rounded-[5px] bg-black/40 border border-[#2D2D2D] px-3 py-2 text-sm text-white outline-none focus:border-white"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={emailStep === 'verify' || isSendingCode || isVerifyingCode}
                />
              </div>
              {emailStep === 'verify' && (
                <div>
                  <label className="block text-xs text-[#bfbfbf] mb-1 tracking-[0.08em] uppercase">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-[5px] bg-black/40 border border-[#2D2D2D] px-3 py-2 text-sm text-white outline-none focus:border-white"
                    placeholder="Enter the code from your email"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    disabled={isVerifyingCode}
                  />
                </div>
              )}
              {emailError && (
                <p className="text-xs text-[#FF1312] leading-[1.5] tracking-[0.8px] whitespace-pre-line">
                  {emailError}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="black"
                size="sm"
                onClick={handleCloseEmailModal}
                disabled={isSendingCode || isVerifyingCode}
              >
                Cancel
              </Button>
              {emailStep === 'input' ? (
                <Button variant="white" size="sm" onClick={handleSendVerificationCode} disabled={isSendingCode}>
                  {isSendingCode ? 'Sending...' : 'Send Code'}
                </Button>
              ) : (
                <Button variant="white" size="sm" onClick={handleVerifyEmail} disabled={isVerifyingCode}>
                  {isVerifyingCode ? 'Verifying...' : 'Verify & Connect'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
