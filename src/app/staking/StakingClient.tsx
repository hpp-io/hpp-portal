'use client';

import React, { useState, useEffect, useCallback, useMemo, useLayoutEffect, useRef } from 'react';
import dayjs from '@/lib/dayjs';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Button from '@/components/ui/Button';
import WalletButton from '@/components/ui/WalletButton';
import { HPPTickerIcon, StakeIcon, UnstakeIcon, ClaimIcon } from '@/assets/icons';
import { useAccount, useWalletClient } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import Big from 'big.js';
import { navItems, legalLinks } from '@/config/navigation';
import { standardArbErc20Abi, hppStakingAbi } from './abi';
import { formatDisplayAmount, PERCENTS, computePercentAmount, formatTokenBalance } from '@/lib/helpers';
import { useHppPublicClient, useHppChain } from './hppClient';
import { useToast } from '@/hooks/useToast';
import { useEnsureChain } from '@/lib/wallet';

type StakingTab = 'stake' | 'unstake' | 'claim';
type TopTab = 'overview' | 'staking' | 'dashboard';

export default function StakingClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topTab, setTopTab] = useState<TopTab>('staking');
  const [activeTab, setActiveTab] = useState<StakingTab>('stake');
  const [amount, setAmount] = useState<string>('');
  const { address, isConnected } = useAccount();
  const [hppBalance, setHppBalance] = useState<string>('0');
  const [isHppBalanceLoading, setIsHppBalanceLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<string>('');
  const [stakedTotal, setStakedTotal] = useState<string>('0');
  const [isStakedTotalLoading, setIsStakedTotalLoading] = useState<boolean>(false);
  const [cooldowns, setCooldowns] = useState<
    Array<{ date: string; note: string; amount: string; amountWei: bigint; cooling: boolean; unlock: number }>
  >([]);
  const [isCooldownsLoading, setIsCooldownsLoading] = useState<boolean>(false);
  const [cooldownsInitialized, setCooldownsInitialized] = useState<boolean>(false);
  const [nowSecTick, setNowSecTick] = useState<number>(Math.floor(Date.now() / 1000));
  const HPP_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_HPP_TOKEN_CONTRACT as `0x${string}`;
  const HPP_STAKING_ADDRESS = process.env.NEXT_PUBLIC_HPP_STAKING_CONTRACT as `0x${string}`;
  const DECIMALS = 18;
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // HPP network public client (Sepolia in dev, Mainnet in prod)
  const publicClient = useHppPublicClient();
  const { showToast } = useToast();
  const ensureChain = useEnsureChain();
  const { data: walletClient } = useWalletClient();
  const { chain: hppChain, id: HPP_CHAIN_ID, rpcUrl } = useHppChain();

  // Measure underline widths to match current input text width
  const stakeMeasureRef = useRef<HTMLSpanElement | null>(null);
  const unstakeMeasureRef = useRef<HTMLSpanElement | null>(null);
  const [stakeUnderlineW, setStakeUnderlineW] = useState(0);
  const [unstakeUnderlineW, setUnstakeUnderlineW] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      if (typeof window === 'undefined') return;
      if (activeTab === 'stake') {
        const el = stakeMeasureRef.current;
        if (el) setStakeUnderlineW(el.offsetWidth || 0);
      } else if (activeTab === 'unstake') {
        const el = unstakeMeasureRef.current;
        if (el) setUnstakeUnderlineW(el.offsetWidth || 0);
      }
    };
    // measure on mount and whenever dependencies change
    measure();
    const onResize = () => {
      measure();
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [activeTab, amount]);

  // Read cooldown duration (seconds) from staking contract
  const fetchCooldownDuration = useCallback(async () => {
    try {
      const result = (await publicClient.readContract({
        address: HPP_STAKING_ADDRESS,
        abi: hppStakingAbi,
        functionName: 'cooldownDuration',
      })) as bigint;
      const secs = Number(result);
      if (Number.isFinite(secs) && secs > 0) setCooldownSeconds(secs);
    } catch {
      // keep previous/fallback value
    }
  }, [publicClient, HPP_STAKING_ADDRESS]);

  const handleAmountChange = (raw: string) => {
    const value = raw.replace(/,/g, '');
    // allow digits with optional single decimal point, or empty
    if (/^\d*(\.)?\d*$/.test(value) || value === '') {
      // limit stake input to 2 decimal places
      let twoDecimalAmount = value;
      if ((activeTab === 'stake' || activeTab === 'unstake') && value.includes('.')) {
        const [intPart, fracPart = ''] = value.split('.');
        if (fracPart.length > 2) {
          twoDecimalAmount = `${intPart}.${fracPart.slice(0, 2)}`;
        }
      }
      setAmount(twoDecimalAmount);
      // validate against available balance
      try {
        // Use different base by tab: stake uses wallet HPP balance, unstake uses staked total
        const baseBalanceStr = (activeTab === 'unstake' ? stakedTotal : hppBalance) || '0';
        const cleanBal = baseBalanceStr.replace(/,/g, '') || '0';
        const v = new Big(twoDecimalAmount === '' || twoDecimalAmount === '.' ? '0' : twoDecimalAmount);
        const b = new Big(cleanBal);
        if (v.gt(b)) {
          setInputError('Insufficient HPP balance');
        } else {
          setInputError('');
        }
      } catch {
        setInputError('');
      }
    }
  };

  const setPercent = (p: number) => {
    handleAmountChange(computePercentAmount(hppBalance, p, DECIMALS));
  };
  // Percent helper for Unstake (use stakedTotal as base)
  const setUnstakePercent = (p: number) => {
    handleAmountChange(computePercentAmount(stakedTotal, p, DECIMALS));
  };

  // Derived: total after stake (current staked + input amount)
  const totalAfterStake = useMemo(() => {
    try {
      const base = new Big((stakedTotal || '0').replace(/,/g, '') || '0');
      const add = new Big((amount && amount !== '.' ? amount : '0').replace(/,/g, '') || '0');
      const sum = base.plus(add);
      return `${formatTokenBalance(sum.toString(), 3)} HPP`;
    } catch {
      return `${stakedTotal} HPP`;
    }
  }, [stakedTotal, amount]);

  useEffect(() => {
    let cancelled = false;
    async function readBalance() {
      if (!isConnected || !address || !HPP_TOKEN_ADDRESS) {
        setHppBalance('0');
        setIsHppBalanceLoading(false);
        return;
      }
      try {
        setIsHppBalanceLoading(true);
        const result = (await publicClient.readContract({
          address: HPP_TOKEN_ADDRESS,
          abi: standardArbErc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })) as bigint;
        if (cancelled) return;
        const value = formatUnits(result, DECIMALS);
        const formatted = formatTokenBalance(value, 2);
        setHppBalance(formatted);
        setIsHppBalanceLoading(false);
      } catch (_e) {
        if (!cancelled) {
          setHppBalance('0');
          setIsHppBalanceLoading(false);
        }
      }
    }
    readBalance();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address, isConnected, HPP_TOKEN_ADDRESS]);

  // Writes are handled via viem wallet client
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Ensure wallet is on HPP network (mainnet or sepolia) for staking writes

  // Ensure wallet is connected to HPP network for writes
  const ensureHppChain = async () => {
    await ensureChain(HPP_CHAIN_ID, {
      chainName: hppChain.name,
      rpcUrls: [rpcUrl],
      nativeCurrency: hppChain.nativeCurrency,
    });
  };

  // Balance refresh helper
  const fetchHppBalance = useCallback(async () => {
    if (!isConnected || !address || !HPP_TOKEN_ADDRESS) {
      setHppBalance('0');
      setIsHppBalanceLoading(false);
      return;
    }
    try {
      setIsHppBalanceLoading(true);
      const result = (await publicClient.readContract({
        address: HPP_TOKEN_ADDRESS,
        abi: standardArbErc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })) as bigint;
      const value = formatUnits(result, DECIMALS);
      const formatted = formatTokenBalance(value, 2);
      setHppBalance(formatted);
    } catch (_e) {
      setHppBalance('0');
    } finally {
      setIsHppBalanceLoading(false);
    }
  }, [publicClient, address, isConnected, HPP_TOKEN_ADDRESS]);

  // Read total staked using staking contract stakedBalance(address)
  const fetchStakedTotal = useCallback(async () => {
    if (!isConnected || !address || !HPP_STAKING_ADDRESS) {
      setStakedTotal('0');
      setIsStakedTotalLoading(false);
      return;
    }
    try {
      setIsStakedTotalLoading(true);
      const result = (await publicClient.readContract({
        address: HPP_STAKING_ADDRESS,
        abi: hppStakingAbi,
        functionName: 'stakedBalance',
        args: [address],
      })) as bigint;
      const value = formatUnits(result, DECIMALS);
      const formatted = formatTokenBalance(value, 3);
      setStakedTotal(formatted);
    } catch (_e) {
      setStakedTotal('0');
    } finally {
      setIsStakedTotalLoading(false);
    }
  }, [publicClient, address, isConnected, HPP_STAKING_ADDRESS]);

  // Fetch cooldown entries for claim history
  const fetchCooldowns = useCallback(async () => {
    if (!isConnected || !address || !HPP_STAKING_ADDRESS) {
      setCooldowns([]);
      return;
    }
    try {
      setIsCooldownsLoading(true);
      // 1) read info
      const [totalLength, firstValidIndex, validCount] = (await publicClient.readContract({
        address: HPP_STAKING_ADDRESS,
        abi: hppStakingAbi,
        functionName: 'getCooldownArrayInfo',
        args: [address],
      })) as unknown as [bigint, bigint, bigint];

      const total = Number(totalLength);
      const start = Number(firstValidIndex);
      const count = Number(validCount);
      if (!Number.isFinite(total) || !Number.isFinite(start) || !Number.isFinite(count) || total === 0 || count === 0) {
        setCooldowns([]);
        setIsCooldownsLoading(false);
        return;
      }
      const items: Array<{
        date: string;
        note: string;
        amount: string;
        amountWei: bigint;
        cooling: boolean;
        unlock: number;
      }> = [];
      const nowSec = Math.floor(Date.now() / 1000);

      const contracts = Array.from({ length: count }, (_, rel) => ({
        address: HPP_STAKING_ADDRESS,
        abi: hppStakingAbi,
        functionName: 'getCooldown' as const,
        args: [address as `0x${string}`, BigInt(rel)],
      }));

      const results = (await Promise.all(
        contracts.map((c, rel) =>
          publicClient.readContract({
            address: c.address,
            abi: c.abi,
            functionName: c.functionName,
            args: [address as `0x${string}`, BigInt(rel)] as readonly [`0x${string}`, bigint],
          })
        )
      )) as unknown as Array<[bigint, bigint]>;

      results.forEach(([amountBn, unlockTimeBn]) => {
        const amountStr = formatTokenBalance(formatUnits(amountBn, DECIMALS), 3);
        const end = Number(unlockTimeBn);
        const cooling = nowSec < end;
        // Show the initial unstake (cooldown start) time derived from unlockTime - cooldown
        const startTime = Math.max(0, end - cooldownSeconds);
        const date = formatLocalDateTime(startTime);

        let note: string;
        if (cooling) {
          const remaining = Math.max(0, end - nowSec);
          const d = Math.floor(remaining / 86400);
          const h = Math.floor((remaining % 86400) / 3600);
          const m = Math.floor((remaining % 3600) / 60);
          const s = Math.floor(remaining % 60);
          note = `You will be able to claim in ${String(d).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(
            m
          ).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        } else {
          note = 'You are able to claim.';
        }

        items.push({
          date,
          note,
          amount: `${amountStr} HPP`,
          amountWei: amountBn,
          cooling,
          unlock: end,
        });
      });
      // Sort by unlock time DESC so the most recent (latest) is on top
      items.sort((a, b) => b.unlock - a.unlock);
      setCooldowns(items);
    } catch {
      setCooldowns([]);
    } finally {
      setIsCooldownsLoading(false);
      setCooldownsInitialized(true);
    }
  }, [publicClient, address, isConnected, HPP_STAKING_ADDRESS, hppStakingAbi, DECIMALS, cooldownSeconds]);

  const onStake = async () => {
    try {
      if (!address || !isConnected) return;
      // basic guards
      if (!amount || amount === '.' || Number(amount) <= 0) return;
      const clean = amount.replace(/,/g, '');
      const amountWei = parseUnits(clean as `${number}`, DECIMALS);

      // Make sure wallet is on HPP network
      try {
        await ensureHppChain();
      } catch {
        showToast('Switch network', 'Please switch to HPP Network in your wallet and try again.', 'error');
        return;
      }
      if (!walletClient) {
        showToast('Error', 'Wallet not ready. Please reconnect and try again.', 'error');
        return;
      }

      setIsSubmitting(true);
      // 1) Check allowance
      const currentAllowance = (await publicClient.readContract({
        address: HPP_TOKEN_ADDRESS,
        abi: standardArbErc20Abi,
        functionName: 'allowance',
        args: [address, HPP_STAKING_ADDRESS],
      })) as bigint;

      // 2) Approve if needed
      let stakeToastDelay = 0;
      if (currentAllowance < amountWei) {
        showToast('Waiting for approval...', 'Please approve in your wallet.', 'loading');
        const approveHash = await walletClient.writeContract({
          address: HPP_TOKEN_ADDRESS,
          abi: standardArbErc20Abi,
          functionName: 'approve',
          args: [HPP_STAKING_ADDRESS, amountWei],
          account: address as `0x${string}`,
          chain: hppChain,
        });
        // Wait for approve confirmation
        await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });
        stakeToastDelay = 800; // small pause before showing stake prompt
      }
      // Prompt stake toast (single path)
      setTimeout(() => {
        showToast('Waiting for stake...', 'Please confirm in your wallet.', 'loading');
      }, stakeToastDelay);

      // 3) Stake
      const stakeHash = await walletClient.writeContract({
        address: HPP_STAKING_ADDRESS,
        abi: hppStakingAbi,
        functionName: 'stake',
        args: [amountWei],
        account: address as `0x${string}`,
        chain: hppChain,
      });
      // Wait for stake confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: stakeHash as `0x${string}` });
      if (receipt.status === 'success') {
        // Build explorer URL and show persistent success toast with link
        const explorerBase = HPP_CHAIN_ID === 190415 ? 'https://explorer.hpp.io' : 'https://sepolia-explorer.hpp.io';
        const txUrl = `${explorerBase}/tx/${stakeHash}`;
        showToast('Stake confirmed', 'Your HPP has been staked successfully.', 'success', {
          text: 'View on Explorer',
          url: txUrl,
        });
        // Refresh balances and reset input (do not auto-close toast)
        await fetchHppBalance();
        await fetchStakedTotal();
        setAmount('');
        setInputError('');
      } else {
        showToast('Stake failed', 'Transaction was rejected or failed.', 'error');
      }
    } catch (_e) {
      console.log(_e, '_e');
      showToast('Error', 'Failed to process staking request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unstake using the amount currently entered in the input
  const onUnstake = async () => {
    try {
      if (!address || !isConnected) return;
      // Parse requested unstake amount from input
      const clean = (amount || '0').replace(/,/g, '');
      if (!clean || Number(clean) <= 0) return;
      const amountWei = parseUnits(clean as `${number}`, DECIMALS);

      // Pre-check: limit of concurrent cooldown entries
      try {
        const [maxEntriesBn, currentCountBn] = (await Promise.all([
          publicClient.readContract({
            address: HPP_STAKING_ADDRESS,
            abi: hppStakingAbi,
            functionName: 'getMaxGlobalCooldownEntries',
          }),
          publicClient.readContract({
            address: HPP_STAKING_ADDRESS,
            abi: hppStakingAbi,
            functionName: 'cooldownCount',
            args: [address],
          }),
        ])) as [bigint, bigint];
        const maxEntries = Number(maxEntriesBn);
        const currentCount = Number(currentCountBn);
        if (Number.isFinite(maxEntries) && Number.isFinite(currentCount) && currentCount >= maxEntries) {
          showToast('Error', 'Once your claim is completed, additional unstake requests are available', 'error');
          return;
        }
      } catch {
        // If check fails, proceed without blocking
      }

      // Ensure HPP chain
      try {
        await ensureHppChain();
      } catch {
        showToast('Switch network', 'Please switch to HPP Network in your wallet and try again.', 'error');
        return;
      }
      if (!walletClient) {
        showToast('Error', 'Wallet not ready. Please reconnect and try again.', 'error');
        return;
      }

      setIsSubmitting(true);
      showToast('Waiting for unstake...', 'Please confirm in your wallet.', 'loading');
      const txHash = await walletClient.writeContract({
        address: HPP_STAKING_ADDRESS,
        abi: hppStakingAbi,
        functionName: 'unstake',
        args: [amountWei],
        account: address as `0x${string}`,
        chain: hppChain,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt.status === 'success') {
        const explorerBase = HPP_CHAIN_ID === 190415 ? 'https://explorer.hpp.io' : 'https://sepolia-explorer.hpp.io';
        const txUrl = `${explorerBase}/tx/${txHash}`;
        showToast('Unstake requested', 'Cooldown started.\nYou can withdraw after it ends.', 'success', {
          text: 'View on Explorer',
          url: txUrl,
        });
        // Refresh balances
        await fetchStakedTotal();
      } else {
        showToast('Unstake failed', 'Transaction was rejected or failed.', 'error');
      }
    } catch (_e) {
      showToast('Error', 'Failed to submit unstake request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Claim withdrawable HPP
  const onClaim = async () => {
    try {
      if (!address || !isConnected) return;
      // Ensure HPP chain
      try {
        await ensureHppChain();
      } catch {
        showToast('Switch network', 'Please switch to HPP Network in your wallet and try again.', 'error');
        return;
      }
      if (!walletClient) {
        showToast('Error', 'Wallet not ready. Please reconnect and try again.', 'error');
        return;
      }

      setIsSubmitting(true);
      showToast('Waiting for claim...', 'Please confirm in your wallet.', 'loading');

      // minimal ABI for withdraw()
      const withdrawAbi = [
        {
          type: 'function',
          name: 'withdraw',
          stateMutability: 'nonpayable',
          inputs: [],
          outputs: [],
        },
      ] as const;

      const txHash = await walletClient.writeContract({
        address: HPP_STAKING_ADDRESS,
        abi: withdrawAbi,
        functionName: 'withdraw',
        args: [],
        account: address as `0x${string}`,
        chain: hppChain,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt.status === 'success') {
        const explorerBase = HPP_CHAIN_ID === 190415 ? 'https://explorer.hpp.io' : 'https://sepolia-explorer.hpp.io';
        const txUrl = `${explorerBase}/tx/${txHash}`;
        showToast('Claim confirmed', 'Your HPP has been claimed successfully.', 'success', {
          text: 'View on Explorer',
          url: txUrl,
        });
        // Refresh amounts relevant to claim
        await fetchHppBalance();
        await fetchCooldowns();
      } else {
        showToast('Claim failed', 'Transaction was rejected or failed.', 'error');
      }
    } catch (_e) {
      showToast('Error', 'Failed to process claim request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset input/errors and refresh balances when tab changes
  React.useEffect(() => {
    setAmount('');
    setInputError('');
    fetchHppBalance();
    fetchStakedTotal();
    setCooldowns([]);
    if (activeTab === 'claim') {
      setCooldownsInitialized(false);
      fetchCooldownDuration().finally(() => {
        fetchCooldowns();
      });
    }
  }, [activeTab, fetchHppBalance, fetchStakedTotal, fetchCooldowns, fetchCooldownDuration]);

  // Fetch cooldown duration on initial mount so stake/unstake messages have the correct value
  React.useEffect(() => {
    fetchCooldownDuration();
  }, [fetchCooldownDuration]);

  // Tick every second on Claim tab to update countdowns
  React.useEffect(() => {
    if (activeTab !== 'claim') return;
    const id = setInterval(() => setNowSecTick(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [activeTab]);

  // When countdown reaches zero, flip to claimable in UI without refetching
  React.useEffect(() => {
    if (activeTab !== 'claim') return;
    const anyExpired = cooldowns.some((c) => c.cooling && c.unlock <= nowSecTick);
    if (!anyExpired) return;
    const updated = cooldowns.map((c) => (c.cooling && c.unlock <= nowSecTick ? { ...c, cooling: false } : c));
    // Keep latest first by unlock time
    updated.sort((a, b) => b.unlock - a.unlock);
    setCooldowns(updated);
  }, [nowSecTick, cooldowns, activeTab]);

  // Reset UI-derived data on disconnect so the screen reflects disconnected state immediately
  React.useEffect(() => {
    if (!isConnected) {
      setCooldowns([]);
      setCooldownsInitialized(false);
      setStakedTotal('0');
      setAmount('');
      setInputError('');
    }
  }, [isConnected]);
  // Local date formatter (YYYY-MM-DD HH:mm) in user's timezone via dayjs
  const formatLocalDateTime = (epochSeconds: number) => dayjs.unix(epochSeconds).format('YYYY-MM-DD HH:mm');

  // Duration formatter for cooldownSeconds (minutes, hours, days, months) via dayjs
  const formatCooldownDuration = (totalSeconds: number) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    if (!s) return '';
    return dayjs.duration(s, 'seconds').humanize();
  };

  // Derived withdrawable from cooldowns (updates per second without needing new block)
  const derivedWithdrawableWei = useMemo(() => {
    if (!cooldowns?.length) return BigInt(0);
    return cooldowns.reduce((acc, c) => (c.unlock <= nowSecTick ? acc + (c.amountWei || BigInt(0)) : acc), BigInt(0));
  }, [cooldowns, nowSecTick]);
  const derivedWithdrawable = useMemo(() => {
    const val = formatUnits(derivedWithdrawableWei, DECIMALS);
    try {
      const v = new Big(val);
      if (v.gt(0) && v.lt(new Big('0.01'))) {
        return '≈0.01';
      }
    } catch {}
    return formatTokenBalance(val, 2);
  }, [derivedWithdrawableWei]);

  // APR and Reward display (UI-level; can be wired to API)
  const DEFAULT_APR_ENV = Number(process.env.NEXT_PUBLIC_STAKING_APR ?? process.env.NEXT_PUBLIC_DEFAULT_APR ?? NaN);
  const expectedAprPercent = useMemo(() => {
    const v = Number.isFinite(DEFAULT_APR_ENV) && DEFAULT_APR_ENV! > 0 ? DEFAULT_APR_ENV! : 13.3;
    return Math.max(0, Math.min(100, v));
  }, [DEFAULT_APR_ENV]);
  const expectedAprDisplay = useMemo(() => `≈${expectedAprPercent.toFixed(1)}%`, [expectedAprPercent]);
  const expectedAnnualReward = useMemo(() => {
    try {
      const amt = new Big((amount || '0').replace(/,/g, '') || '0');
      const reward = amt.times(expectedAprPercent).div(100);
      const decimals = reward.gte(1000) ? 0 : 2;
      return `≈${formatTokenBalance(reward.toString(), decimals)} HPP`;
    } catch {
      return '≈0 HPP';
    }
  }, [amount, expectedAprPercent]);

  // Tabs are rendered inline in JSX (no separate components) for simplicity

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-x-hidden">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        isSidebarOpen={sidebarOpen}
        onBackClick={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          navItems={navItems}
          legalLinks={legalLinks}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? 'opacity-50 min-[1200px]:opacity-100' : ''
          }`}
        >
          {/* Wrap content to push footer to bottom on mobile */}
          <div className="min-h-[calc(100vh-66px)] min-[1200px]:min-h-[calc(100vh-85px)] flex flex-col">
            {/* Hero Section */}
            <div className="py-12.5">
              <div className="px-4 max-w-6xl mx-auto text-center">
                <div className="flex justify-center mb-3">
                  <DotLottieReact
                    src="/lotties/Staking.lottie"
                    autoplay
                    loop
                    className="w-20 h-20"
                    renderConfig={{
                      autoResize: true,
                      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2,
                      freezeOnOffscreen: true,
                    }}
                    layout={{ fit: 'contain', align: [0.5, 0.5] }}
                  />
                </div>
                <div className="text-white font-[900] leading-[1.2]">
                  <div className="text-4xl min-[810px]:text-5xl">HPP Staking</div>
                </div>
                <div className="mt-4">
                  <p className="text-lg text-[#bfbfbf]">
                    Stake your HPP to earn rewards and participate in HPP ecosystem
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 max-w-6xl mx-auto w-full">
              <div className="my-7.5 flex items-center gap-2.5">
                {(['overview', 'staking', 'dashboard'] as TopTab[]).map((id) => {
                  const isActive = topTab === id;
                  const label = id === 'overview' ? 'Overview' : id === 'staking' ? 'Staking' : 'My Dashboard';
                  return (
                    <Button
                      key={id}
                      size="sm"
                      variant={isActive ? 'primary' : 'black'}
                      className={[
                        '!rounded-full px-4 py-2 text-sm font-semibold',
                        !isActive ? '!bg-[#121212]' : '',
                      ].join(' ')}
                      aria-pressed={isActive}
                      onClick={() => setTopTab(id)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              {topTab === 'staking' ? (
                <div className="mx-auto w-full">
                  {/* Panel */}
                  <div className="mt-5 w-full mb-25">
                    <div className="rounded-[8px] px-5 py-7.5 bg-[#4b4ab0]">
                      {/* Sub-tabs */}
                      <div className="w-full mb-5">
                        <div className="flex items-center gap-2">
                          {(['stake', 'unstake', 'claim'] as StakingTab[]).map((id) => {
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
                            <h3 className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px]">
                              Amount
                            </h3>
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
                              <span
                                ref={stakeMeasureRef}
                                className="absolute top-0 left-0 invisible pointer-events-none whitespace-pre text-[40px] font-semibold leading-[1.2] tracking-[0.8px]"
                              >
                                {formatDisplayAmount(amount || '0.00')}
                              </span>
                              {/* <div
                                className={`${inputError ? 'bg-[#FF1312]' : 'bg-white'} h-[4px] mt-1`}
                                style={{ width: `${stakeUnderlineW}px` }}
                              /> */}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 mt-5">
                            {PERCENTS.map((p) => {
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
                                <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                                  Expected APR
                                </div>
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
                                  • HPP will be available to withdraw {formatCooldownDuration(cooldownSeconds)} after
                                  unstaking.
                                </li>
                                <li>
                                  • Your APR and rewards may vary depending on overall participation and ecosystem
                                  activity.
                                </li>
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
                            <h3 className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px]">
                              Amount
                            </h3>
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
                              <span
                                ref={unstakeMeasureRef}
                                className="absolute top-0 left-0 invisible pointer-events-none whitespace-pre text-[40px] font-semibold leading-[1.2] tracking-[0.8px]"
                              >
                                {formatDisplayAmount(amount || '0.00')}
                              </span>
                              {/* <div
                                className={`${inputError ? 'bg-[#FF1312]' : 'bg-white'} h-[4px] mt-1`}
                                style={{ width: `${unstakeUnderlineW}px` }}
                              /> */}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 mt-5">
                            {PERCENTS.map((p) => {
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
                                • HPP will be available to withdraw {formatCooldownDuration(cooldownSeconds)} after
                                unstaking.
                              </li>
                              <li>
                                • Your APR and rewards may vary depending on overall participation and ecosystem
                                activity.
                              </li>
                            </ul>
                          </div>

                          <div className="mt-5">
                            {!isConnected ? (
                              <div className="w-full">
                                <WalletButton size="lg" />
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
                          {/* Claim Available Card */}
                          <div className="flex rounded-[5px] items-center gap-2.5">
                            <h3 className="text-white text-base font-normal leading-[1.2] tracking-[0.8px]">
                              Claim Available
                            </h3>
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
                                • HPP will be available to withdraw {formatCooldownDuration(cooldownSeconds)} after
                                unstaking.
                              </li>
                              <li>
                                • When the cooldown is over, your tokens will be accumulated to ‘Claim Available.’
                              </li>
                              <li>
                                • Your APR and rewards may vary depending on overall participation and ecosystem
                                activity.
                              </li>
                            </ul>
                          </div>

                          <div className="mt-5">
                            {!isConnected ? (
                              <div className="w-full">
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

                          {/* Transactions - Card 2 */}
                          <div className="mt-5 rounded-[5px] bg-[#121212] py-3 px-5">
                            {(isCooldownsLoading || !cooldownsInitialized) && (
                              <div className="flex flex-col items-center justify-center py-8">
                                <div className="mb-4">
                                  <DotLottieReact
                                    src="/lotties/Loading.lottie"
                                    autoplay
                                    loop
                                    style={{ width: 48, height: 48 }}
                                  />
                                </div>
                                <p className="text-base text-[#bfbfbf] tracking-[0.8px] leading-[1.5] text-center font-normal animate-pulse">
                                  Fetching cooldown entries...
                                </p>
                              </div>
                            )}
                            {!isCooldownsLoading && cooldownsInitialized && cooldowns.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-8">
                                <p className="text-base text-[#bfbfbf] tracking-[0.8px] leading-[1.5] text-center font-normal">
                                  No claim history.
                                </p>
                              </div>
                            )}
                            {!isCooldownsLoading && cooldownsInitialized && cooldowns.length > 0 && (
                              <div className="divide-y divide-[#2D2D2D]">
                                {cooldowns.map((tx, idx) => {
                                  const remaining = Math.max(0, tx.unlock - nowSecTick);
                                  const d = Math.floor(remaining / 86400);
                                  const h = Math.floor((remaining % 86400) / 3600);
                                  const m = Math.floor((remaining % 3600) / 60);
                                  const s = Math.floor(remaining % 60);
                                  const dd = String(d).padStart(2, '0');
                                  const hh = String(h).padStart(2, '0');
                                  const mm = String(m).padStart(2, '0');
                                  const ss = String(s).padStart(2, '0');
                                  const countdown = `${dd}:${hh}:${mm}:${ss}`;
                                  return (
                                    <div key={idx} className="py-4">
                                      <div className="flex items-center justify-between">
                                        <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                                          {tx.date}
                                        </div>
                                        <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal whitespace-nowrap">
                                          {tx.amount}
                                        </div>
                                      </div>
                                      <div
                                        className={
                                          tx.cooling
                                            ? 'mt-2.5 text-[#25FF21] text-base leading-[1.2] tracking-[0.8px] font-normal'
                                            : 'mt-2.5 text-white text-base leading-[1.2] tracking-[0.8px] font-normal'
                                        }
                                      >
                                        {tx.cooling ? (
                                          <>
                                            You will be able to claim in{' '}
                                            <span className="tabular-nums tracking-[0.1em]">{countdown}</span>
                                          </>
                                        ) : (
                                          'You are able to claim.'
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[5px] p-6 min-[1200px]:p-8 bg-[#121212] text-[#bfbfbf]">
                  <p className="text-base">This section is coming soon.</p>
                </div>
              )}
            </div>
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
