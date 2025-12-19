'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import Dropdown from '@/components/ui/Dropdown';
import FaqSection from '@/components/ui/Faq';
import { stakingData } from '@/static/uiData';
import dayjs from '@/lib/dayjs';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Button from '@/components/ui/Button';
import WalletButton from '@/components/ui/WalletButton';
import {
  HPPTickerIcon,
  StakeIcon,
  UnstakeIcon,
  ClaimIcon,
  APR_Web1,
  APR_Web2,
  APR_Mobile1,
  APR_Mobile2,
} from '@/assets/icons';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { getWalletClient } from '@wagmi/core';
import { formatUnits, parseUnits } from 'viem';
import Big from 'big.js';
import { navItems, legalLinks } from '@/config/navigation';
import { standardArbErc20Abi, hppStakingAbi } from './abi';
import { formatDisplayAmount, PERCENTS, computePercentAmount, formatTokenBalance } from '@/lib/helpers';
import { useHppPublicClient, useHppChain } from './hppClient';
import { useToast } from '@/hooks/useToast';
import { useEnsureChain } from '@/lib/wallet';
import { config as wagmiConfig } from '@/config/walletConfig';
import axios from 'axios';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, ReferenceDot, AreaChart, Area, Tooltip } from 'recharts';

type StakingTab = 'stake' | 'unstake' | 'claim';
type TopTab = 'overview' | 'staking' | 'dashboard';

export default function StakingClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topTab, setTopTab] = useState<TopTab>('overview');
  const [activeTab, setActiveTab] = useState<StakingTab>('stake');
  const [amount, setAmount] = useState<string>('');
  // Hoisted APR calculator controls to persist across tab switches
  const [calcPreRegYes, setCalcPreRegYes] = useState<'yes' | 'no'>('yes');
  const [calcWhaleTier, setCalcWhaleTier] = useState<string>('T3');
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

  // Overview chart states (TVL history)
  const [overviewTvl, setOverviewTvl] = useState<Array<{ date: string; value: string }>>([]);
  const [totalStakers, setTotalStakers] = useState<number>(0);
  const [totalStakedAmount, setTotalStakedAmount] = useState<string>('0');
  const [baseApr, setBaseApr] = useState<number>(0);
  const [maxApr, setMaxApr] = useState<number>(0);
  const [chartSideMargin, setChartSideMargin] = useState<number>(40);
  const [isNarrow450, setIsNarrow450] = useState<boolean>(false);
  const [isNarrow600, setIsNarrow600] = useState<boolean>(false);
  // Delay chart render until mounted for smoother first animation
  const [isChartReady, setIsChartReady] = useState<boolean>(false);
  // Overview stats loading
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);
  const [statsInitialized, setStatsInitialized] = useState<boolean>(false);
  // Stable key to animate chart once on first successful load
  const [chartAnimKey, setChartAnimKey] = useState<string | null>(null);
  // APR Journey tab (UI only)
  const [aprTab, setAprTab] = useState<'pre' | 'whale' | 'hold' | 'dao'>('pre');
  // TVL period dropdown and config
  const PERIODS: Array<{ key: string; label: string }> = [
    { key: '1M', label: '1 Month' },
    { key: '3M', label: '3 Month' },
    { key: '6M', label: '6 Month' },
    { key: '1Y', label: '1 Year' },
    { key: 'ALL', label: 'All' },
  ];
  const [period, setPeriod] = useState<string>('1M');

  // HPP network public client (Sepolia in dev, Mainnet in prod)
  const publicClient = useHppPublicClient();
  const { showToast } = useToast();
  const ensureChain = useEnsureChain();
  const { data: walletClient } = useWalletClient();
  const currentChainId = useChainId();
  const { chain: hppChain, id: HPP_CHAIN_ID, rpcUrl } = useHppChain();

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

  // Overview: fetch stats used for chart (same API as pre-registration)
  const fetchOverviewStats = useCallback(async () => {
    try {
      setIsStatsLoading(true);
      const apiPeriod = period === 'ALL' ? 'All' : period;
      const resp = await axios.get('https://hpp-stake-stats-dev.hpp.io/api/stats', {
        headers: { accept: 'application/json' },
        params: { period: apiPeriod },
      });
      const data: any = resp?.data ?? {};
      if (data?.success && data?.data) {
        const d = data.data;
        if (typeof d.totalStakers === 'number') setTotalStakers(d.totalStakers);
        if (typeof d.totalStakedAmount === 'string') setTotalStakedAmount(d.totalStakedAmount);
        if (typeof d.baseAPR === 'number') setBaseApr(d.baseAPR);
        if (typeof d.maxAPR === 'number') setMaxApr(d.maxAPR);
        if (Array.isArray(d.tvlHistory)) setOverviewTvl(d.tvlHistory);
      }
    } catch {
      // ignore network errors; keep defaults
    } finally {
      setIsStatsLoading(false);
      setStatsInitialized(true);
    }
  }, [period]);

  // Overview: responsive margins like PreRegistration chart (throttled with rAF)
  useEffect(() => {
    const compute = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
      setChartSideMargin(w <= 600 ? 10 : 40);
      setIsNarrow450(w <= 450);
      setIsNarrow600(w <= 600);
    };
    compute();
    let frame: number | null = null;
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        compute();
        frame = null;
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  useEffect(() => {
    setIsChartReady(true);
  }, []);

  // Do NOT force reconnect when user is disconnected.
  // Only align chain when already connected.

  // After reconnect or chain changes, ensure HPP chain
  useEffect(() => {
    if (!isConnected) return;
    if (currentChainId !== undefined && currentChainId !== HPP_CHAIN_ID) {
      (async () => {
        try {
          await ensureHppChain();
        } catch {
          // user may cancel; keep UI guarded by isConnected + chain anyway
        }
      })();
    }
  }, [isConnected, currentChainId, HPP_CHAIN_ID]);
  // Set a stable animation key once when stats are first initialized
  useEffect(() => {
    if (statsInitialized && !chartAnimKey) {
      const first = overviewTvl?.[0]?.date || 'init';
      const last = overviewTvl?.[overviewTvl.length - 1]?.date || 'init';
      setChartAnimKey(`tvl-init-${first}-${last}`);
    }
  }, [statsInitialized, overviewTvl, chartAnimKey]);
  // Prefetch lottie spinner to avoid first-render delay
  useEffect(() => {
    try {
      fetch('/lotties/Loading.lottie', { cache: 'force-cache' }).catch(() => {});
    } catch {}
  }, []);

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

  // Overview: build TVL chart data (API returns 18-decimal strings)
  const tvlChartData = useMemo(() => {
    const src = Array.isArray(overviewTvl) ? overviewTvl : [];
    const denom = new Big(10).pow(18);
    return src.map((d) => {
      let tvlNum = 0;
      try {
        tvlNum = parseFloat(new Big(d.value || '0').div(denom).toString());
      } catch {}
      return {
        dateLabel: dayjs(d.date).format('MM-DD'),
        fullLabel: dayjs(d.date).format('YYYY-MM-DD'),
        tvl: tvlNum,
      };
    });
  }, [overviewTvl]);

  // Overview: formatted Total Staked Amount (18-decimals to display)
  const totalStakedAmountDisplay = useMemo(() => {
    try {
      const wei = BigInt((totalStakedAmount || '0').replace(/[^\d]/g, '') || '0');
      const units = formatUnits(wei, 18);
      // Show without decimals (can adjust if needed)
      return formatTokenBalance(units, 0);
    } catch {
      return '0';
    }
  }, [totalStakedAmount]);

  const setPercent = (p: number) => {
    handleAmountChange(computePercentAmount(hppBalance, p, DECIMALS));
  };
  // Percent helper for Unstake (use stakedTotal as base)
  const setUnstakePercent = (p: number) => {
    handleAmountChange(computePercentAmount(stakedTotal, p, DECIMALS));
  };

  // // Derived: total after stake (current staked + input amount)
  // const totalAfterStake = useMemo(() => {
  //   try {
  //     const base = new Big((stakedTotal || '0').replace(/,/g, '') || '0');
  //     const add = new Big((amount && amount !== '.' ? amount : '0').replace(/,/g, '') || '0');
  //     const sum = base.plus(add);
  //     return `${formatTokenBalance(sum.toString(), 3)} HPP`;
  //   } catch {
  //     return `${stakedTotal} HPP`;
  //   }
  // }, [stakedTotal, amount]);

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
      // Resolve wallet client (hook or core fallback)
      const hppWalletClient =
        walletClient ?? (await getWalletClient(wagmiConfig, { account: address, chainId: HPP_CHAIN_ID }));
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
        const approveHash = await hppWalletClient.writeContract({
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
      const stakeHash = await hppWalletClient.writeContract({
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
      const hppWalletClient =
        walletClient ?? (await getWalletClient(wagmiConfig, { account: address, chainId: HPP_CHAIN_ID }));

      setIsSubmitting(true);
      showToast('Waiting for unstake...', 'Please confirm in your wallet.', 'loading');
      const txHash = await hppWalletClient.writeContract({
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
        // Clear input/errors like stake flow
        setAmount('');
        setInputError('');
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
      const hppWalletClient =
        walletClient ?? (await getWalletClient(wagmiConfig, { account: address, chainId: HPP_CHAIN_ID }));

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

      const txHash = await hppWalletClient.writeContract({
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

  // Fetch overview stats when Overview tab is active
  React.useEffect(() => {
    if (topTab !== 'overview') return;
    fetchOverviewStats();
  }, [topTab, fetchOverviewStats]);

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

  const formatCompact = useCallback((n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
    if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return `${n.toLocaleString()}`;
  }, []);
  const formatNumberWithCommas = useCallback((n: number) => {
    try {
      if (!Number.isFinite(n)) return '0';
      return n.toLocaleString();
    } catch {
      return '0';
    }
  }, []);
  const formatYAxisTick = useCallback(
    (n: number) => {
      const abs = Math.abs(n);
      // Use commas for smaller values, compact for large
      if (abs < 1e6) return formatNumberWithCommas(n);
      return formatCompact(n);
    },
    [formatNumberWithCommas, formatCompact]
  );

  // Custom tooltip with HPP ticker
  const renderTvlTooltip = useCallback(
    ({ active, payload, label }: any) => {
      if (!active || !payload || !payload.length) return null;
      const val = Number(payload[0]?.value ?? 0);
      const fullLabel = payload?.[0]?.payload?.fullLabel ?? label;
      return (
        <div
          className="rounded-[6px] border border-[#2D2D2D] bg-[#0f0f0f] px-3 py-2 shadow-lg"
          style={{ pointerEvents: 'none' }}
        >
          <div className="text-xs text-white/70 mb-1">{fullLabel}</div>
          <div className="flex items-center gap-1.5 text-white font-semibold">
            <HPPTickerIcon className="w-4 h-4" />
            <span>{formatNumberWithCommas(val)}</span>
            <span className="text-white/70 text-xs">HPP</span>
          </div>
        </div>
      );
    },
    [formatNumberWithCommas]
  );

  // APR Journey images: Staking uses Phase 2 only
  const aprImageDesktop = useMemo(() => APR_Web2, []);
  const aprImageMobile = useMemo(() => APR_Mobile2, []);

  // Tabs are rendered inline in JSX (no separate components) for simplicity

  // Inline APR Calculator component (memoized to avoid re-renders on unrelated tab changes)
  const AprCalculator = React.memo(function AprCalculator({
    preRegYes,
    setPreRegYes,
    whaleTier,
    setWhaleTier,
  }: {
    preRegYes: 'yes' | 'no';
    setPreRegYes: React.Dispatch<React.SetStateAction<'yes' | 'no'>>;
    whaleTier: string;
    setWhaleTier: React.Dispatch<React.SetStateAction<string>>;
  }) {
    // Whale tiers (Bonus Credit multipliers for dropdown labels only)
    const WHALE_TIERS = [
      { key: 'T1', label: 'Tier 1 (≥ 10,000)', credit: 1.01 },
      { key: 'T2', label: 'Tier 2 (≥ 50,000)', credit: 1.03 },
      { key: 'T3', label: 'Tier 3 (≥ 100,000)', credit: 1.05 },
      { key: 'T4', label: 'Tier 4 (≥ 300,000)', credit: 1.07 },
      { key: 'T5', label: 'Tier 5 (≥ 500,000)', credit: 1.1 },
      { key: 'T6', label: 'Tier 6 (≥ 1,000,000)', credit: 1.15 },
    ] as const;
    // Coming soon toggles (kept for future; not shown)

    // API-driven APR
    const [isAprLoading, setIsAprLoading] = useState(false);
    const [apiBaseApr, setApiBaseApr] = useState<number>(10);
    const [apiBonusApr, setApiBonusApr] = useState<number>(0);
    const [apiWhaleCredit, setApiWhaleCredit] = useState<number>(1);
    const [apiFinalApr, setApiFinalApr] = useState<number>(10);

    useEffect(() => {
      let cancelled = false;
      const run = async () => {
        try {
          setIsAprLoading(true);
          const tierNum = Math.max(1, Math.min(6, Number(String(whaleTier).replace(/\D/g, '')) || 1));
          const resp = await axios.get('https://hpp-stake-stats-dev.hpp.io/api/apr/calculate', {
            params: { tier: tierNum, preRegistered: preRegYes === 'yes' },
            headers: { accept: 'application/json' },
          });
          const data: any = resp?.data ?? {};
          const d = data?.data ?? {};
          if (!cancelled && data?.success && d) {
            if (typeof d.baseAPR === 'number') setApiBaseApr(d.baseAPR);
            if (typeof d.bonusAPR === 'number') setApiBonusApr(d.bonusAPR);
            if (typeof d.whaleBoostCredit === 'number') setApiWhaleCredit(d.whaleBoostCredit);
            if (typeof d.finalAPR === 'number') setApiFinalApr(d.finalAPR);
          }
        } catch {
          // keep previous values on failure
        } finally {
          if (!cancelled) setIsAprLoading(false);
        }
      };
      run();
      return () => {
        cancelled = true;
      };
    }, [whaleTier, preRegYes]);

    const expectedAprDisplay = useMemo(() => `${Math.round(apiFinalApr)}%`, [apiFinalApr]);

    return (
      <div className="mt-5 rounded-[5px] bg-[#121212] px-5 py-7.5">
        <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px] font-semibold mb-4">APR Calculator</div>
        {/* Cards row with operators between (desktop) */}
        <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch">
          {/* Base APR */}
          <div className="rounded-[5px] border border-[#2D2D2D] bg-[#0f0f0f] p-5">
            <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0] font-normal text-center mb-2.5">
              Base APR
            </div>
            <div className="flex items-center justify-center text-[#5DF23F] text-base font-normal">
              <span>{isAprLoading ? '-' : `${apiBaseApr}%`}</span>
              <span className="mx-2.5 text-[#bfbfbf] text-base font-normal">+</span>
              <span className="flex items-center gap-1">
                <span className="text-[#5DF23F]">🔥</span>
                <span>{isAprLoading ? '-' : `${apiBonusApr}%`}</span>
              </span>
            </div>
          </div>
          {/* Operator × */}
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
            <div className="flex items-center justify-center gap-2 text-[#5DF23F] text-base font-normal">
              <span className="flex items-center gap-1">
                🐳 <span>{isAprLoading ? '-' : `${Math.round(apiWhaleCredit * 100)}%`}</span>
              </span>
            </div>
          </div>
          {/* Operator = */}
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
              <span>{isAprLoading ? '-' : expectedAprDisplay}</span>
            </div>
          </div>
          {/* End of operators */}
        </div>

        {/* Controls - vertical stack with labeled rows */}
        <div className="mt-8 w-full">
          <div className="flex flex-col gap-6 w-full">
            {/* Pre-Registration: Yes/No */}
            <div className="flex items-center justify-between w-full gap-3">
              <span className="text-white text-base leading-[1.5] tracking-[0.8px]">🔥 Pre-Registration</span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-white text-base leading-[1.5] tracking-[0.8px]">
                  <input
                    type="checkbox"
                    className="accent-[#5DF23F] w-4 h-4"
                    checked={preRegYes === 'yes'}
                    onChange={(e) => setPreRegYes(e.target.checked ? 'yes' : 'no')}
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-2 text-white/70 text-base leading-[1.5] tracking-[0.8px]">
                  <input
                    type="checkbox"
                    className="accent-[#5DF23F] w-4 h-4"
                    checked={preRegYes === 'no'}
                    onChange={(e) => setPreRegYes(e.target.checked ? 'no' : 'yes')}
                  />
                  <span>No</span>
                </label>
              </div>
            </div>
            {/* Whale Boost: Tier Select */}
            <div className="flex items-center justify-between w-full gap-3">
              <span className="text-white text-base leading-[1.5] tracking-[0.8px]">🐳 Whale Boost</span>
              <Dropdown
                value={whaleTier}
                onChange={setWhaleTier}
                options={WHALE_TIERS.map((t, idx) => ({ key: t.key, label: `Tier ${idx + 1}` }))}
              />
            </div>
            {/* Hold & Earn: Coming Soon */}
            <div className="flex items-center justify-between w-full gap-3">
              <span className="text-[#9c9c9c] text-base leading-[1.5] tracking-[0.8px]">💰 Hold &amp; Earn</span>
              <span className="text-[#9c9c9c] text-base leading-[20px] tracking-[0]">Coming Soon</span>
            </div>
            {/* DAO Participation: Coming Soon */}
            <div className="flex items-center justify-between w-full gap-3">
              <span className="text-[#9c9c9c] text-base leading-[1.5] tracking-[0.8px]">📝 DAO Participation</span>
              <span className="text-[#9c9c9c] text-base leading-[20px] tracking-[0]">Coming Soon</span>
            </div>
          </div>
        </div>

        {/* Footnote */}
        <div className="mt-5">
          <div className="text-[#5DF23F] font-semibold text-base leading-[1.5] tracking-[0.8px]">Important</div>
          <ul className="mt-1 text-base text-white leading-[1.5] tracking-[0.8px] list-disc pl-5">
            <li>Bonus Credit can increase your APR.</li>
            <li>Your final APR is calculated as (Base APR + Bonus APR) × (Bonus Credit).</li>
          </ul>
        </div>
      </div>
    );
  });
  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-x-hidden">
      <Head>
        <link rel="preload" href="/lotties/Loading.lottie" as="fetch" crossOrigin="anonymous" />
      </Head>
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
                              <span className="absolute top-0 left-0 invisible pointer-events-none whitespace-pre text-[40px] font-semibold leading-[1.2] tracking-[0.8px]">
                                {formatDisplayAmount(amount || '0.00')}
                              </span>
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
                              <span className="absolute top-0 left-0 invisible pointer-events-none whitespace-pre text-[40px] font-semibold leading-[1.2] tracking-[0.8px]">
                                {formatDisplayAmount(amount || '0.00')}
                              </span>
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
                    {/* Transactions - Card 2 */}
                    {activeTab === 'claim' && isConnected && (
                      <>
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
              ) : topTab === 'overview' ? (
                <div className="mx-auto w-full">
                  <div className="mt-5 w-full mb-25">
                    <div className="rounded-[8px] bg-[#121212] border border-[#2D2D2D] overflow-hidden">
                      <div className="px-5 pt-5 pb-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[#BFBFBF] text-base font-semibold leading-[1.2] tracking-[0.8px]">
                              Total Value Locked
                            </span>
                          </div>
                          <Dropdown value={period} onChange={setPeriod} options={PERIODS} />
                        </div>
                      </div>
                      <div className="relative h-[240px] min-[1000px]:h-[280px] w-full px-2">
                        {!statsInitialized || isStatsLoading ? (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <DotLottieReact
                              src="/lotties/Loading.lottie"
                              autoplay
                              loop
                              style={{ width: 48, height: 48 }}
                            />
                          </div>
                        ) : isChartReady && tvlChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              key={chartAnimKey ?? 'tvl-init'}
                              data={tvlChartData}
                              margin={{ top: 10, right: chartSideMargin, left: chartSideMargin, bottom: 10 }}
                            >
                              <defs>
                                <linearGradient id="tvlFillGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#5DF23F" stopOpacity={0.35} />
                                  <stop offset="100%" stopColor="#5DF23F" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid vertical stroke="#2a2a2a" strokeDasharray="3 6" horizontal={false} />
                              <XAxis
                                dataKey="dateLabel"
                                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12, dy: 0 }}
                                tickMargin={8}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tickFormatter={formatYAxisTick}
                                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                                width={48}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                content={renderTvlTooltip}
                                cursor={{ stroke: '#2D2D2D', strokeDasharray: '3 6' }}
                              />
                              <Area
                                type="monotone"
                                dataKey="tvl"
                                stroke="#5DF23F"
                                strokeWidth={1}
                                fill="url(#tvlFillGradient)"
                                fillOpacity={1}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                isAnimationActive={true}
                                animationDuration={500}
                                animationEasing="ease-out"
                              />
                              {tvlChartData.length > 0 ? (
                                <ReferenceDot
                                  x={tvlChartData[tvlChartData.length - 1].dateLabel}
                                  y={tvlChartData[tvlChartData.length - 1].tvl}
                                  r={5}
                                  fill="#5DF23F"
                                  stroke="#e6ffe2"
                                  strokeWidth={2}
                                  isAnimationActive={true}
                                />
                              ) : null}
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#bfbfbf] text-sm">
                            No TVL data.
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 min-[900px]:grid-cols-4 border-t border-[#2D2D2D] divide-y divide-[#2D2D2D] min-[900px]:divide-y-0">
                        <div className="p-7.5 flex flex-col items-center justify-center text-center">
                          <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px]">Total Stakers</div>
                          <div className="text-white text-3xl font-semibold leading-[24px] mt-2.5">
                            {totalStakers.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-7.5 min-[900px]:border-l border-[#2D2D2D] flex flex-col items-center justify-center text-center">
                          <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px]">
                            Total Staked Amount
                          </div>
                          <div className="flex items-center gap-1.5 justify-center mt-2.5">
                            <HPPTickerIcon className="w-6 h-6" />
                            <span className="text-white text-3xl font-semibold leading-[24px]">
                              {totalStakedAmountDisplay}
                            </span>
                          </div>
                        </div>
                        <div className="p-7.5 min-[900px]:border-l border-[#2D2D2D] flex flex-col items-center justify-center text-center">
                          <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px]">Base APR</div>
                          <div className="text-white text-3xl font-semibold leading-[24px] mt-2.5">{baseApr}%</div>
                        </div>
                        <div className="p-7.5 min-[900px]:border-l border-[#2D2D2D] flex flex-col items-center justify-center text-center">
                          <div className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px]">Max APR</div>
                          <div className="text-white text-3xl font-semibold leading-[24px] mt-2.5">{maxApr}%</div>
                        </div>
                      </div>
                    </div>
                    {/* APR Journey (image-based) */}
                    <div className="mt-5 rounded-[5px] bg-[#121212] overflow-hidden">
                      <div className="px-5 pt-5 pb-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[#BFBFBF] text-base font-semibold leading-[1.2] tracking-[0.8px]">
                              APR Journey
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-5 w-full">
                        {/* Desktop / large screens */}
                        <Image
                          src={aprImageDesktop}
                          alt="APR Journey"
                          className="hidden min-[900px]:block w-full h-auto"
                          loading="lazy"
                          sizes="100vw"
                          style={{ width: '100%', height: 'auto' }}
                          priority={false}
                        />
                        {/* Mobile */}
                        <Image
                          src={aprImageMobile}
                          alt="APR Journey"
                          className="block min-[900px]:hidden w-full h-auto"
                          loading="lazy"
                          sizes="100vw"
                          style={{ width: '100%', height: 'auto' }}
                          priority={false}
                        />
                      </div>
                      {/* APR Journey Tabs */}
                      <div className="mt-7.5 px-5 pb-5">
                        <div className="flex items-center gap-3 flex-wrap">
                          {(
                            [
                              { id: 'pre', label: '🔥 Pre-Registration' },
                              { id: 'whale', label: '🐳 Whale Boost' },
                              { id: 'hold', label: '💰 Hold & Earn' },
                              { id: 'dao', label: '📝 DAO Participation' },
                            ] as Array<{ id: 'pre' | 'whale' | 'hold' | 'dao'; label: string }>
                          ).map((t) => {
                            const isActive = aprTab === t.id;
                            return (
                              <Button
                                key={t.id}
                                size="sm"
                                variant={isActive ? 'white' : 'black'}
                                className={[
                                  '!rounded-full px-5 py-3.5 text-base font-semibold leading-[1]',
                                  !isActive ? '!bg-[#1c1c1c] !text-[#9c9c9c]' : '!text-black',
                                ].join(' ')}
                                onClick={() => setAprTab(t.id)}
                                aria-pressed={isActive}
                              >
                                {t.label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      {/* APR Journey Content (reference from Pre-Registration page) */}
                      {aprTab === 'pre' && (
                        <div className="px-5 pb-7.5">
                          <div className="text-white text-base leading-[20px] tracking-[0] font-semibold">
                            <span className="mr-1">🔥</span>
                            <span>Pre-Registration: Bring your buddy, Boost the APR, Earn together!</span>
                          </div>
                          {/* Progress track (10% ~ 20%) */}
                          {(() => {
                            const wallets = Math.max(0, Math.min(1000, totalStakers || 0));
                            const progressPercent = (wallets / 1000) * 100;
                            const formattedTotalWallets = wallets >= 1000 ? '1,000+' : wallets.toLocaleString();
                            // determine cutoff percent step
                            const steps = [10, 12, 14, 16, 18, 20] as const;
                            const idx = Math.max(0, Math.min(5, Math.floor(Math.max(0, wallets - 1) / 200)));
                            const CUTOFF_PERCENT = steps[idx];
                            return (
                              <div className="mt-10">
                                <div className="relative">
                                  <div className="h-5 rounded-full bg-black/50 relative overflow-hidden">
                                    {([12, 14, 16, 18, 20] as const).map((p) => {
                                      const leftPct = ((p - 10) / (20 - 10)) * 100;
                                      const tickColor = p <= CUTOFF_PERCENT ? '#0b0b0b' : 'rgba(255,255,255,0.24)';
                                      return (
                                        <div
                                          key={p}
                                          className="absolute top-0 bottom-0 border-l border-dashed z-10"
                                          style={{ left: `${leftPct}%`, borderColor: tickColor }}
                                        />
                                      );
                                    })}
                                    <div
                                      className="h-full bg-[#5DF23F] rounded-l-full"
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                  <div
                                    className="absolute -top-7"
                                    style={{ left: `${progressPercent}%`, transform: 'translateX(-50%)' }}
                                  >
                                    <span className="relative inline-block px-2 py-1 rounded bg-[#5DF23F] text-black text-sm font-semibold shadow">
                                      {formattedTotalWallets}
                                      <span
                                        className="absolute left-1/2"
                                        style={{
                                          transform: 'translateX(-50%)',
                                          bottom: -10,
                                          width: 0,
                                          height: 0,
                                          borderLeft: '6px solid transparent',
                                          borderRight: '6px solid transparent',
                                          borderTop: '6px solid #5DF23F',
                                          borderBottom: '6px solid transparent',
                                        }}
                                      />
                                    </span>
                                  </div>
                                </div>
                                {/* tick labels */}
                                <div className="mt-2 relative h-5">
                                  {[
                                    { p: 10, label: isNarrow450 ? '10%' : '10% (Base)' },
                                    { p: 12, label: '12%' },
                                    { p: 14, label: '14%' },
                                    { p: 16, label: '16%' },
                                    { p: 18, label: '18%' },
                                    { p: 20, label: isNarrow450 ? '20%' : '20% (Max)' },
                                  ].map(({ p, label }) => {
                                    const isGreen = p >= 10 && p <= CUTOFF_PERCENT;
                                    const leftPct = ((p - 10) / (20 - 10)) * 100;
                                    return (
                                      <span
                                        key={p}
                                        className={[
                                          'absolute whitespace-nowrap font-semibold text-xs min-[810px]:text-sm',
                                          isGreen ? 'text-[#5DF23F]' : 'text-white',
                                          p === 10
                                            ? 'translate-x-0 text-left'
                                            : p === 20
                                            ? '-translate-x-full text-right'
                                            : '-translate-x-1/2 text-center',
                                        ].join(' ')}
                                        style={{ left: p === 10 ? '0%' : p === 20 ? '100%' : `${leftPct}%` }}
                                      >
                                        {label}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                          {/* Rows */}
                          <div className="mt-6 grid grid-cols-1 min-[600px]:grid-cols-2 gap-x-6">
                            {(() => {
                              const rows = [
                                { range: '0~200 Wallets', desc: 'Standard APR (10%)', apr: 'APR 10% (Base)' },
                                {
                                  range: '201~400 Wallets',
                                  desc: 'Standard APR (10%) + Bonus APR (2%)',
                                  apr: 'APR 12%',
                                },
                                {
                                  range: '401~600 Wallets',
                                  desc: 'Standard APR (10%) + Bonus APR (4%)',
                                  apr: 'APR 14%',
                                },
                                {
                                  range: '601~800 Wallets',
                                  desc: 'Standard APR (10%) + Bonus APR (6%)',
                                  apr: 'APR 16%',
                                },
                                {
                                  range: '801~1000 Wallets',
                                  desc: 'Standard APR (10%) + Bonus APR (8%)',
                                  apr: 'APR 18%',
                                },
                                {
                                  range: '1,000+ Wallets',
                                  desc: 'Standard APR (10%) + Bonus APR (10%)',
                                  apr: 'APR 20% (Max)',
                                },
                              ];
                              // Drive activation from API values (same logic as Pre-Registration page)
                              const wallets = Math.max(0, Math.min(1000, totalStakers || 0));
                              const steps = [10, 12, 14, 16, 18, 20] as const;
                              const currentRangeIdx = wallets >= 1000 ? 5 : Math.floor(Math.max(0, wallets - 1) / 200);
                              const cutoffIdx = Math.max(
                                0,
                                steps.indexOf(
                                  ((): (typeof steps)[number] => {
                                    const idx = Math.max(0, Math.min(5, Math.floor(Math.max(0, wallets - 1) / 200)));
                                    return steps[idx];
                                  })()
                                )
                              );
                              return rows.map((row, idx) => {
                                const leftActive = idx <= currentRangeIdx;
                                const rightActive = idx <= cutoffIdx;
                                return (
                                  <React.Fragment key={idx}>
                                    {/* Left: wallet bracket */}
                                    <div className={idx === rows.length - 1 ? '' : 'mb-5'}>
                                      <div
                                        className={[
                                          'inline-block font-bold text-sm px-3 py-2 rounded',
                                          leftActive ? 'bg-[#5DF23F] text-black' : 'bg-white text-black',
                                        ].join(' ')}
                                      >
                                        {row.range}
                                      </div>
                                      {/* Mobile (≤600px): one-line with check and combined APR */}
                                      <div
                                        className={[
                                          'mt-2 text-sm flex items-center gap-1 min-[600px]:hidden',
                                          leftActive ? 'text-[#5DF23F]' : 'text-white/80',
                                        ].join(' ')}
                                      >
                                        {rightActive && (
                                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#5DF23F] text-[#5DF23F] text-[10px] leading-none">
                                            ✓
                                          </span>
                                        )}
                                        <span>
                                          {`${row.desc} = ${
                                            isNarrow600
                                              ? row.apr.replace('APR ', '').replace(/\s*\((Base|Max)\)\s*/g, '')
                                              : row.apr.replace('APR ', '')
                                          }`}
                                        </span>
                                      </div>
                                      {/* Desktop (≥600px): original two-line description */}
                                      <div
                                        className={[
                                          'mt-2 text-sm hidden min-[600px]:block',
                                          leftActive ? 'text-[#5DF23F]' : 'text-white/80',
                                        ].join(' ')}
                                      >
                                        {row.desc}
                                      </div>
                                    </div>
                                    {/* Right: APR label with reached indicator */}
                                    <div
                                      className={[
                                        'hidden min-[600px]:flex items-center justify-end gap-1',
                                        idx === rows.length - 1 ? '' : 'mb-5',
                                      ].join(' ')}
                                    >
                                      {rightActive && (
                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#5DF23F] text-[#5DF23F] text-[10px] leading-none">
                                          ✓
                                        </span>
                                      )}
                                      <span
                                        className={[
                                          'inline-block text-sm font-semibold text-right',
                                          rightActive ? 'text-[#5DF23F]' : 'text-white',
                                        ].join(' ')}
                                      >
                                        {row.apr}
                                      </span>
                                    </div>
                                  </React.Fragment>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                      {aprTab === 'whale' && (
                        <div className="px-5 pb-7.5">
                          <div className="text-white text-base leading-[20px] tracking-[0] font-semibold mb-4">
                            <span className="mr-1">🐳</span>
                            <span>Whale Boost: The more you stake, the higher your APR</span>
                          </div>
                          {/* Table Header */}
                          <div className="grid grid-cols-3 gap-3 bg-[#2D2D2D] text-[#bfbfbf] rounded-[5px] px-4 py-2 text-base font-semibold">
                            <div className="text-left">Tier</div>
                            <div className="text-center">HPP Amount</div>
                            <div className="text-right">Bonus Credit</div>
                          </div>
                          {/* Rows */}
                          <div className="space-y-1">
                            {[
                              { tier: 'Tier 1', amount: '≥ 10,000', bonus: 'x101%' },
                              { tier: 'Tier 2', amount: '≥ 50,000', bonus: 'x103%' },
                              { tier: 'Tier 3', amount: '≥ 100,000', bonus: 'x105%' },
                              { tier: 'Tier 4', amount: '≥ 300,000', bonus: 'x107%' },
                              { tier: 'Tier 5', amount: '≥ 500,000', bonus: 'x110%' },
                              { tier: 'Tier 6', amount: '≥ 1,000,000', bonus: 'x115%' },
                            ].map((r, idx, arr) => (
                              <div
                                key={r.tier}
                                className={[
                                  'grid grid-cols-3 gap-3 items-center px-2 py-3',
                                  idx !== arr.length - 1 ? 'border-b border-[#2D2D2D]' : '',
                                ].join(' ')}
                              >
                                <div className="text-left">
                                  <span className="inline-block bg-[#5DF23F] text-black text-sm font-bold px-3 py-1.5 rounded">
                                    {r.tier}
                                  </span>
                                </div>
                                <div className="text-white text-base text-center leading-[1] tracking-[0] font-normal">
                                  {r.amount}
                                </div>
                                <div className="text-right text-[#5DF23F] text-base font-semibold leading-[1] tracking-[0] pr-6">
                                  {r.bonus}
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Footnote */}
                          <div className="mt-5">
                            <div className="text-[#5DF23F] text-base leading-[1.5] tracking-[0.8px] font-semibold">
                              Important
                            </div>
                            <ul className="text-base text-white leading-[1.5] tracking-[0.8px] list-disc pl-5">
                              <li>Bonus Credit can increase your APR.</li>
                              <li>Your final APR is calculated as (Base APR + Bonus APR) × (Bonus Credit).</li>
                            </ul>
                          </div>
                        </div>
                      )}
                      {(aprTab === 'hold' || aprTab === 'dao') && (
                        <div className="px-5 pb-7.5">
                          <div className="rounded-[5px] bg-[#1c1c1c] px-5 py-7.5">
                            <div className="text-[#9c9c9c] text-base leading-[20px] tracking-[0] font-semibold">
                              Coming Soon
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* APR Calculator */}
                    <AprCalculator
                      preRegYes={calcPreRegYes}
                      setPreRegYes={setCalcPreRegYes}
                      whaleTier={calcWhaleTier}
                      setWhaleTier={setCalcWhaleTier}
                    />

                    {/* Staking FAQ (shared component) */}
                    <FaqSection items={stakingData.staking.faq} className="px-5 mt-37.5 max-w-6xl mx-auto w-full" />
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
