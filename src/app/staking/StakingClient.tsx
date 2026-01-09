'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import dayjs from '@/lib/dayjs';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Button from '@/components/ui/Button';
import WalletButton from '@/components/ui/WalletButton';
import { HPPTickerIcon, StakeIcon, UnstakeIcon, ClaimIcon } from '@/assets/icons';
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
import OverviewSection from './OverviewSection';
import DashboardSection from './DashboardSection';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setSidebarOpen,
  setTopTab,
  setActiveTab,
  setAmount,
  setInputError,
  setAprLoading,
  setAprBase,
  setAprBonus,
  setAprWhaleCredit,
  setAprHoldCredit,
  setAprDaoCredit,
  setAprTotal,
  setFinalAPR,
  setStakingFinalAPR,
  setStakingExpectedReward,
  setStakingExpectedRewardLoading,
  setWalletAprLoading,
  setWalletBaseApr,
  setWalletBonusApr,
  setWalletWhaleCredit,
  setWalletHoldCredit,
  setWalletDaoCredit,
  setWalletStakedAmountDisplay,
  setActivities,
  setActivitiesLoading,
  setActivityPage,
  addLocalActivity,
  updateBlockscoutActivities,
  setHppBalance,
  setIsHppBalanceLoading,
  setStakedTotal,
  setIsStakedTotalLoading,
  setCooldowns,
  setIsCooldownsLoading,
  setCooldownsInitialized,
  setNowSecTick,
  setCooldownSeconds,
  setChartSideMargin,
  setIsNarrow450,
  setIsNarrow600,
  setIsChartReady,
  setChartAnimKey,
} from '@/store/slices';

type StakingTab = 'stake' | 'unstake' | 'claim';
type TopTab = 'overview' | 'staking' | 'dashboard';

export default function StakingClient() {
  const dispatch = useAppDispatch();
  // UI state
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const topTab = useAppSelector((state) => state.ui.topTab);
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  // Input state
  const amount = useAppSelector((state) => state.input.amount);
  const inputError = useAppSelector((state) => state.input.inputError);
  // APR Calculator controls
  const calcPreRegYes = useAppSelector((state) => state.apr.calcPreRegYes);
  const calcWhaleTier = useAppSelector((state) => state.apr.calcWhaleTier);
  const aprTotal = useAppSelector((state) => state.apr.aprTotal);
  const finalAPR = useAppSelector((state) => state.apr.finalAPR);
  // Staking state
  const stakingFinalAPR = useAppSelector((state) => state.staking.stakingFinalAPR);
  const stakingExpectedReward = useAppSelector((state) => state.staking.stakingExpectedReward);
  const stakingExpectedRewardLoading = useAppSelector((state) => state.staking.stakingExpectedRewardLoading);

  // Activities
  const activities = useAppSelector((state) => state.activities.activities);

  useEffect(() => {
    dispatch(setActivityPage(1));
  }, [activities, dispatch]);
  // Only refetch when inputs change
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        dispatch(setAprLoading(true));
        const tierNum = Math.max(1, Math.min(6, Number(String(calcWhaleTier).replace(/\D/g, '')) || 1));
        const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_STAKING_API_URL;
        if (!apiBaseUrl) {
          console.error('NEXT_PUBLIC_HPP_STAKING_API_URL is not set');
          return;
        }
        const resp = await axios.get(`${apiBaseUrl}/apr/calculate`, {
          params: { tier: tierNum, preRegistered: calcPreRegYes === 'yes' },
          headers: { accept: 'application/json' },
        });
        const data: any = resp?.data ?? {};
        const d = data?.data ?? {};
        if (!cancelled && data?.success && d) {
          if (typeof d.baseAPR === 'number') dispatch(setAprBase(d.baseAPR));
          if (typeof d.bonusAPR === 'number') dispatch(setAprBonus(d.bonusAPR));
          if (typeof d.whaleBoostCredit === 'number') dispatch(setAprWhaleCredit(d.whaleBoostCredit));
          const holdC = d.holdCredit ?? d.holdBoostCredit ?? d.holdAPR;
          if (typeof holdC === 'number') dispatch(setAprHoldCredit(holdC));
          const daoC = d.daoCredit ?? d.daoBoostCredit ?? d.governanceCredit;
          if (typeof daoC === 'number') dispatch(setAprDaoCredit(daoC));
          if (typeof d.totalAPR === 'number') dispatch(setAprTotal(d.totalAPR));
          // Always use finalAPR if available, otherwise calculate or use totalAPR
          if (typeof d.finalAPR === 'number') {
            dispatch(setFinalAPR(d.finalAPR));
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) dispatch(setAprLoading(false));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [calcWhaleTier, calcPreRegYes, dispatch]);
  const { address, isConnected } = useAccount();
  const bannerAvatarRef = React.useRef<any>(null);
  React.useEffect(() => {
    if (bannerAvatarRef.current && address) {
      bannerAvatarRef.current.address = address;
      bannerAvatarRef.current.setAttribute('address', address);
    }
  }, [address]);
  // Balance state
  const hppBalance = useAppSelector((state) => state.balance.hppBalance);
  const isHppBalanceLoading = useAppSelector((state) => state.balance.isHppBalanceLoading);
  const stakedTotal = useAppSelector((state) => state.balance.stakedTotal);
  const isStakedTotalLoading = useAppSelector((state) => state.balance.isStakedTotalLoading);
  // Cooldown state
  const cooldowns = useAppSelector((state) => state.cooldown.cooldowns);
  const isCooldownsLoading = useAppSelector((state) => state.cooldown.isCooldownsLoading);
  const cooldownsInitialized = useAppSelector((state) => state.cooldown.cooldownsInitialized);
  const nowSecTick = useAppSelector((state) => state.cooldown.nowSecTick);
  const cooldownSeconds = useAppSelector((state) => state.cooldown.cooldownSeconds);
  const HPP_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_HPP_TOKEN_CONTRACT as `0x${string}`;
  const HPP_STAKING_ADDRESS = process.env.NEXT_PUBLIC_HPP_STAKING_CONTRACT as `0x${string}`;
  const DECIMALS = 18;

  // Overview chart states (TVL history)
  const overviewTvl = useAppSelector((state) => state.overview.overviewTvl);
  const statsInitialized = useAppSelector((state) => state.overview.statsInitialized);
  const chartAnimKey = useAppSelector((state) => state.overview.chartAnimKey);

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
      if (Number.isFinite(secs) && secs > 0) dispatch(setCooldownSeconds(secs));
    } catch {
      // keep previous/fallback value
    }
  }, [publicClient, HPP_STAKING_ADDRESS, dispatch]);

  // Overview: responsive margins like PreRegistration chart (throttled with rAF)
  useEffect(() => {
    const compute = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
      dispatch(setChartSideMargin(w <= 600 ? 10 : 40));
      dispatch(setIsNarrow450(w <= 450));
      dispatch(setIsNarrow600(w <= 600));
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
  }, [dispatch]);
  useEffect(() => {
    dispatch(setIsChartReady(true));
  }, [dispatch]);

  // Fetch wallet-specific APR for My Dashboard
  const fetchWalletApr = useCallback(async () => {
    if (!isConnected || !address) {
      dispatch(setWalletAprLoading(false));
      dispatch(setWalletBaseApr(null));
      dispatch(setWalletBonusApr(null));
      dispatch(setWalletWhaleCredit(null));
      dispatch(setWalletHoldCredit(null));
      dispatch(setWalletDaoCredit(null));
      dispatch(setWalletStakedAmountDisplay(''));
      return;
    }
    try {
      dispatch(setWalletAprLoading(true));
      const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_STAKING_API_URL;
      if (!apiBaseUrl) {
        console.error('NEXT_PUBLIC_HPP_STAKING_API_URL is not set');
        dispatch(setWalletAprLoading(false));
        return;
      }
      const resp = await axios.get(`${apiBaseUrl}/apr/wallet/${address}`, {
        headers: { accept: 'application/json' },
      });
      const data: any = resp?.data ?? {};
      const d = data?.data ?? {};
      if (data?.success && d) {
        if (typeof d.baseAPR === 'number') dispatch(setWalletBaseApr(d.baseAPR));
        if (typeof d.bonusAPR === 'number') dispatch(setWalletBonusApr(d.bonusAPR));
        if (typeof d.whaleBoostCredit === 'number') dispatch(setWalletWhaleCredit(d.whaleBoostCredit));
        const holdC = (d as any).holdCredit ?? (d as any).holdBoostCredit ?? (d as any).holdAPR ?? null;
        const daoC = (d as any).daoCredit ?? (d as any).daoBoostCredit ?? (d as any).governanceCredit ?? null;
        dispatch(setWalletHoldCredit(typeof holdC === 'number' ? (holdC as number) : null));
        dispatch(setWalletDaoCredit(typeof daoC === 'number' ? (daoC as number) : null));
        // Convert big strings (18 decimals) to display
        try {
          if (typeof d.stakedAmount === 'string') {
            const units = formatUnits(BigInt(d.stakedAmount), 18);
            dispatch(setWalletStakedAmountDisplay(`${formatTokenBalance(units, 3)} HPP`));
          } else {
            dispatch(setWalletStakedAmountDisplay(''));
          }
        } catch {
          dispatch(setWalletStakedAmountDisplay(''));
        }
      }
    } catch {
      // ignore per-req failure; keep previous
    } finally {
      dispatch(setWalletAprLoading(false));
    }
  }, [isConnected, address, dispatch]);

  useEffect(() => {
    fetchWalletApr();
  }, [fetchWalletApr]);

  // Fetch activity list from Blockscout (staking interactions + HPP token transfers)
  const fetchActivities = useCallback(async () => {
    if (!isConnected || !address || !HPP_STAKING_ADDRESS) {
      dispatch(setActivities([]));
      dispatch(setActivitiesLoading(false));
      return;
    }
    const lambdaBase = process.env.NEXT_PUBLIC_HPP_BLOCKSCOUT_PROXY_URL;
    if (!lambdaBase) {
      console.error('NEXT_PUBLIC_HPP_BLOCKSCOUT_PROXY_URL is not defined');
      dispatch(setActivitiesLoading(false));
      return;
    }
    try {
      dispatch(setActivitiesLoading(true));
      // Blockscout API v2 via Lambda proxy: addresses/{staking}/transactions and filter by caller wallet (fetch all pages)
      const isMainnet = HPP_CHAIN_ID === 190415;
      const network = isMainnet ? 'mainnet' : 'sepolia';
      const baseUrl = `${lambdaBase}/blockscout/${network}/api/v2/addresses/${HPP_STAKING_ADDRESS}/transactions`;
      let items: any[] = [];
      try {
        let nextUrl: string | null = baseUrl;
        let guard = 0;
        while (nextUrl && guard < 200) {
          const resp = await axios.get(nextUrl, { headers: { accept: 'application/json' } });
          const pageItems: any[] = resp?.data?.items ?? [];
          if (Array.isArray(pageItems) && pageItems.length > 0) items.push(...pageItems);
          const np = resp?.data?.next_page_params;
          if (!np || pageItems.length === 0) {
            nextUrl = null;
            break;
          }
          const qs = new URLSearchParams();
          if (np.index !== undefined) qs.set('index', String(np.index));
          if (np.value !== undefined) qs.set('value', String(np.value));
          if (np.hash !== undefined) qs.set('hash', String(np.hash));
          if (np.inserted_at !== undefined) qs.set('inserted_at', String(np.inserted_at));
          if (np.block_number !== undefined) qs.set('block_number', String(np.block_number));
          if (np.fee !== undefined) qs.set('fee', String(np.fee));
          if (np.items_count !== undefined) qs.set('items_count', String(np.items_count));
          nextUrl = `${baseUrl}?${qs.toString()}`;
          guard += 1;
        }
      } catch {}
      const walletLc = address.toLowerCase();
      let mapped = Array.isArray(items)
        ? items
            .filter((it: any) => String(it?.from?.hash || '').toLowerCase() === walletLc)
            .map((it: any) => {
              const method = String(it.method || it?.decoded_input?.method_call || '').toLowerCase();
              // Status mapping
              const res = String(it.result || '').toLowerCase();
              const ok = String(it.status || '').toLowerCase() === 'ok';
              const hasRevert = !!it.revert_reason;
              const status =
                hasRevert || res === 'failed' ? 'Rejected' : ok && res === 'success' ? 'Completed' : 'Pending';
              // Amount from decoded parameters (18 decimals)
              let amountDisplay: string | undefined;
              try {
                const params: any[] = it?.decoded_input?.parameters ?? [];
                const p = Array.isArray(params) ? params.find((x) => x?.name === 'amount') : null;
                if (p?.value) {
                  const units = formatUnits(BigInt(String(p.value)), 18);
                  amountDisplay = `${formatTokenBalance(units, 3)} HPP`;
                }
              } catch {}
              const actionDisplay = method
                ? method.toLowerCase() === 'withdraw'
                  ? 'Claim'
                  : method.charAt(0).toUpperCase() + method.slice(1)
                : 'Contract Call';
              return {
                id: String(it.hash),
                date: dayjs(new Date(String(it.timestamp)).getTime()).format('YYYY-MM-DD HH:mm'),
                action: actionDisplay,
                amount: amountDisplay,
                status,
              };
            })
            .sort((a: any, b: any) => {
              // Parse dates for accurate comparison
              const dateA = new Date(a.date.replace(' ', 'T')).getTime();
              const dateB = new Date(b.date.replace(' ', 'T')).getTime();
              return dateB - dateA; // Most recent first (descending)
            })
        : [];
      // Fallback amount for withdraw/claim from token transfers if missing
      try {
        const needAmount = mapped.filter((m: any) => !m.amount);
        const tokenAddr = (process.env.NEXT_PUBLIC_HPP_TOKEN_CONTRACT || '').toLowerCase();
        if (needAmount.length > 0 && tokenAddr) {
          // 1) Fast path: address-level token transfers (single request; includes withdraw amounts)
          try {
            const addrTUrl = `${lambdaBase}/blockscout/${network}/api/v2/addresses/${address}/token-transfers?type=`;
            const addrTResp = await axios.get(addrTUrl, { headers: { accept: 'application/json' } });
            const addrTItems: any[] = addrTResp?.data?.items ?? [];
            if (Array.isArray(addrTItems) && addrTItems.length > 0) {
              const stakingLc = HPP_STAKING_ADDRESS.toLowerCase();
              const walletLc = address.toLowerCase();
              const byHashQuick = new Map<string, string>();
              for (const tr of addrTItems) {
                const tokenLc = String(tr?.token?.address_hash || '').toLowerCase();
                if (tokenLc !== tokenAddr) continue;
                const method = String(tr?.method || '').toLowerCase();
                // withdraw transfers: to wallet (from may not always equal staking on explorer)
                const toLc = String(tr?.to?.hash || '').toLowerCase();
                const fromLc = String(tr?.from?.hash || '').toLowerCase();
                if (!(method === 'withdraw' && toLc === walletLc)) continue;
                const txHash = String(tr?.transaction_hash || tr?.tx_hash || tr?.hash || '');
                if (!txHash) continue;
                const dec =
                  Number(tr?.token?.decimals) || Number(tr?.total?.decimals) || Number(tr?.token_decimals) || 18;
                const raw = String(tr?.total?.value ?? tr?.value ?? tr?.amount ?? '0');
                try {
                  const units = formatUnits(BigInt(raw), Number.isFinite(dec) ? dec : 18);
                  byHashQuick.set(txHash.toLowerCase(), `${formatTokenBalance(units, 3)} HPP`);
                } catch {}
              }
              if (byHashQuick.size > 0) {
                mapped = mapped.map((m: any) => {
                  if (!m.amount) {
                    const v = byHashQuick.get(String(m.id).toLowerCase());
                    if (v) return { ...m, amount: v };
                  }
                  return m;
                });
              }
            }
          } catch {}
        }
      } catch {
        // ignore transfer backfill failures
      }
      // Update Blockscout activities while preserving local activities
      // The reducer will handle merging and preserving local activities automatically
      dispatch(updateBlockscoutActivities(mapped));
    } catch {
      // On error, preserve local activities and only clear Blockscout data
      // Use updateBlockscoutActivities with empty array to clear Blockscout data but keep local activities
      dispatch(updateBlockscoutActivities([]));
    } finally {
      dispatch(setActivitiesLoading(false));
    }
  }, [isConnected, address, HPP_STAKING_ADDRESS, HPP_CHAIN_ID, dispatch]);

  // Fetch activities on mount and when wallet connection changes
  useEffect(() => {
    if (isConnected && address && HPP_STAKING_ADDRESS) {
      fetchActivities();
    } else if (!isConnected) {
      // Clear activities when disconnected
      dispatch(setActivities([]));
      dispatch(setActivitiesLoading(false));
    }
  }, [isConnected, address, HPP_STAKING_ADDRESS, fetchActivities, dispatch]);

  // Fetch activities when Dashboard tab is active
  React.useEffect(() => {
    if (topTab === 'dashboard' && isConnected && address && HPP_STAKING_ADDRESS) {
      fetchActivities();
    }
  }, [topTab, isConnected, address, HPP_STAKING_ADDRESS, fetchActivities]);

  // Poll for activities when there are local pending activities
  useEffect(() => {
    const localPendingActivities = activities.filter((a) => a.isLocal && a.status === 'Pending');
    if (localPendingActivities.length === 0) return;
    if (!isConnected || !address) return;

    // Poll every 5 seconds to check if pending activities have been indexed
    const intervalId = setInterval(() => {
      fetchActivities();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [activities, isConnected, address, fetchActivities]);

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
      dispatch(setChartAnimKey(`tvl-init-${first}-${last}`));
    }
  }, [statsInitialized, overviewTvl, chartAnimKey, dispatch]);
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
      dispatch(setAmount(twoDecimalAmount));
      // validate against available balance
      try {
        // Use different base by tab: stake uses wallet HPP balance, unstake uses staked total
        const baseBalanceStr = (activeTab === 'unstake' ? stakedTotal : hppBalance) || '0';
        const cleanBal = baseBalanceStr.replace(/,/g, '') || '0';
        const v = new Big(twoDecimalAmount === '' || twoDecimalAmount === '.' ? '0' : twoDecimalAmount);
        const b = new Big(cleanBal);
        if (v.gt(b)) {
          dispatch(setInputError('Insufficient HPP balance'));
        } else {
          dispatch(setInputError(''));
        }
      } catch {
        dispatch(setInputError(''));
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

  useEffect(() => {
    let cancelled = false;
    async function readBalance() {
      if (!isConnected || !address || !HPP_TOKEN_ADDRESS) {
        dispatch(setHppBalance('0'));
        dispatch(setIsHppBalanceLoading(false));
        return;
      }
      try {
        dispatch(setIsHppBalanceLoading(true));
        const result = (await publicClient.readContract({
          address: HPP_TOKEN_ADDRESS,
          abi: standardArbErc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })) as bigint;
        if (cancelled) return;
        const value = formatUnits(result, DECIMALS);
        const formatted = formatTokenBalance(value, 2);
        dispatch(setHppBalance(formatted));
        dispatch(setIsHppBalanceLoading(false));
      } catch (_e) {
        if (!cancelled) {
          dispatch(setHppBalance('0'));
          dispatch(setIsHppBalanceLoading(false));
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
      dispatch(setHppBalance('0'));
      dispatch(setIsHppBalanceLoading(false));
      return;
    }
    try {
      dispatch(setIsHppBalanceLoading(true));
      const result = (await publicClient.readContract({
        address: HPP_TOKEN_ADDRESS,
        abi: standardArbErc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })) as bigint;
      const value = formatUnits(result, DECIMALS);
      const formatted = formatTokenBalance(value, 2);
      dispatch(setHppBalance(formatted));
    } catch (_e) {
      dispatch(setHppBalance('0'));
    } finally {
      dispatch(setIsHppBalanceLoading(false));
    }
  }, [publicClient, address, isConnected, HPP_TOKEN_ADDRESS, dispatch]);

  // Read total staked using staking contract stakedBalance(address)
  const fetchStakedTotal = useCallback(async () => {
    if (!isConnected || !address || !HPP_STAKING_ADDRESS) {
      dispatch(setStakedTotal('0'));
      dispatch(setIsStakedTotalLoading(false));
      return;
    }
    try {
      dispatch(setIsStakedTotalLoading(true));
      const result = (await publicClient.readContract({
        address: HPP_STAKING_ADDRESS,
        abi: hppStakingAbi,
        functionName: 'stakedBalance',
        args: [address],
      })) as bigint;
      const value = formatUnits(result, DECIMALS);
      const formatted = formatTokenBalance(value, 3);
      dispatch(setStakedTotal(formatted));
    } catch (_e) {
      dispatch(setStakedTotal('0'));
    } finally {
      dispatch(setIsStakedTotalLoading(false));
    }
  }, [publicClient, address, isConnected, HPP_STAKING_ADDRESS, dispatch]);

  // Fetch cooldown entries for claim history
  const fetchCooldowns = useCallback(async () => {
    if (!isConnected || !address || !HPP_STAKING_ADDRESS) {
      dispatch(setCooldowns([]));
      return;
    }
    try {
      dispatch(setIsCooldownsLoading(true));
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
        dispatch(setCooldowns([]));
        dispatch(setIsCooldownsLoading(false));
        return;
      }
      const items: Array<{
        date: string;
        note: string;
        amount: string;
        amountWei: string; // Store as string for Redux
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
          amountWei: amountBn.toString(), // Convert bigint to string for Redux
          cooling,
          unlock: end,
        });
      });
      // Sort by unlock time DESC so the most recent (latest) is on top
      items.sort((a, b) => b.unlock - a.unlock);
      dispatch(setCooldowns(items));
    } catch {
      dispatch(setCooldowns([]));
    } finally {
      dispatch(setIsCooldownsLoading(false));
      dispatch(setCooldownsInitialized(true));
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
        // Add local activity immediately (Pending status)
        const amountDisplay = `${formatTokenBalance(clean, 3)} HPP`;
        dispatch(
          addLocalActivity({
            id: stakeHash,
            date: dayjs().format('YYYY-MM-DD HH:mm'),
            action: 'Stake',
            amount: amountDisplay,
            status: 'Pending',
            isLocal: true,
          })
        );
        // Refresh activities to merge local activity with Blockscout data
        // Polling will handle checking Blockscout automatically
        setTimeout(() => fetchActivities(), 2000); // Initial check after 2 seconds
        // Refresh balances and reset input (do not auto-close toast)
        await fetchHppBalance();
        await fetchStakedTotal();
        await fetchWalletApr();
        dispatch(setAmount(''));
        dispatch(setInputError(''));
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
        // Add local activity immediately (Pending status)
        const amountDisplay = `${formatTokenBalance(clean, 3)} HPP`;
        dispatch(
          addLocalActivity({
            id: txHash,
            date: dayjs().format('YYYY-MM-DD HH:mm'),
            action: 'Unstake',
            amount: amountDisplay,
            status: 'Pending',
            isLocal: true,
          })
        );
        // Refresh activities to merge local activity with Blockscout data
        // Polling will handle checking Blockscout automatically
        setTimeout(() => fetchActivities(), 2000); // Initial check after 2 seconds
        // Refresh balances
        await fetchStakedTotal();
        await fetchWalletApr();
        // Clear input/errors like stake flow
        dispatch(setAmount(''));
        dispatch(setInputError(''));
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
        // Add local activity immediately (Pending status)
        // Calculate claim amount from derivedWithdrawableWei
        const claimAmount = formatUnits(derivedWithdrawableWei, 18);
        const amountDisplay = `${formatTokenBalance(claimAmount, 3)} HPP`;
        dispatch(
          addLocalActivity({
            id: txHash,
            date: dayjs().format('YYYY-MM-DD HH:mm'),
            action: 'Claim',
            amount: amountDisplay,
            status: 'Pending',
            isLocal: true,
          })
        );
        // Refresh activities to merge local activity with Blockscout data
        // Polling will handle checking Blockscout automatically
        setTimeout(() => fetchActivities(), 2000); // Initial check after 2 seconds
        // Refresh amounts relevant to claim
        await fetchHppBalance();
        await fetchStakedTotal();
        await fetchWalletApr();
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
    dispatch(setAmount(''));
    dispatch(setInputError(''));
    fetchHppBalance();
    fetchStakedTotal();
    dispatch(setCooldowns([]));
    if (activeTab === 'claim') {
      dispatch(setCooldownsInitialized(false));
      fetchCooldownDuration().finally(() => {
        fetchCooldowns();
      });
    }
  }, [activeTab, fetchHppBalance, fetchStakedTotal, fetchCooldowns, fetchCooldownDuration, dispatch]);

  // Fetch cooldowns when Dashboard tab is active (for Unclaimed Reward display)
  React.useEffect(() => {
    if (topTab === 'dashboard' && isConnected && address) {
      fetchCooldownDuration().finally(() => {
        fetchCooldowns();
      });
    }
  }, [topTab, isConnected, address, fetchCooldownDuration, fetchCooldowns]);

  // Fetch cooldown duration on initial mount so stake/unstake messages have the correct value
  React.useEffect(() => {
    fetchCooldownDuration();
  }, [fetchCooldownDuration]);

  // Tick every second on Claim tab to update countdowns
  React.useEffect(() => {
    if (activeTab !== 'claim') return;
    const id = setInterval(() => dispatch(setNowSecTick(Math.floor(Date.now() / 1000))), 1000);
    return () => clearInterval(id);
  }, [activeTab, dispatch]);

  // When countdown reaches zero, flip to claimable in UI without refetching
  React.useEffect(() => {
    if (activeTab !== 'claim') return;
    const anyExpired = cooldowns.some((c) => c.cooling && c.unlock <= nowSecTick);
    if (!anyExpired) return;
    const updated = cooldowns.map((c) => (c.cooling && c.unlock <= nowSecTick ? { ...c, cooling: false } : c));
    // Keep latest first by unlock time
    updated.sort((a, b) => b.unlock - a.unlock);
    dispatch(setCooldowns(updated));
  }, [nowSecTick, cooldowns, activeTab, dispatch]);

  // Reset UI-derived data on disconnect so the screen reflects disconnected state immediately
  React.useEffect(() => {
    if (!isConnected) {
      dispatch(setCooldowns([]));
      dispatch(setCooldownsInitialized(false));
      dispatch(setStakedTotal('0'));
      dispatch(setAmount(''));
      dispatch(setInputError(''));
      // Reset staking Expected APR and Reward
      dispatch(setStakingFinalAPR(10));
      dispatch(setStakingExpectedReward('≈0 HPP'));
      dispatch(setStakingExpectedRewardLoading(false));
    }
  }, [isConnected, dispatch]);
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
    return cooldowns.reduce(
      (acc, c) => (c.unlock <= nowSecTick ? acc + (c.amountWei ? BigInt(c.amountWei) : BigInt(0)) : acc),
      BigInt(0)
    );
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

  // Calculate staking-specific finalAPR and expectedReward based on amount + stakedTotal (debounced)
  useEffect(() => {
    // Only run for stake and unstake tabs
    if (activeTab !== 'stake' && activeTab !== 'unstake') return;
    if (!isConnected || !address) {
      // Reset when disconnected
      dispatch(setStakingFinalAPR(10));
      dispatch(setStakingExpectedReward('≈0 HPP'));
      dispatch(setStakingExpectedRewardLoading(false));
      return;
    }

    // Don't call API if there's an input error
    if (inputError) return;

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        // Set loading state
        if (!cancelled) dispatch(setStakingExpectedRewardLoading(true));
        // Calculate stakedAmount based on activeTab
        const baseStaked = new Big((stakedTotal || '0').replace(/,/g, '') || '0');
        const inputAmt = new Big((amount || '0').replace(/,/g, '') || '0');
        const stakedAmount = activeTab === 'stake' ? baseStaked.plus(inputAmt) : baseStaked.minus(inputAmt);
        // Ensure it doesn't go below 0
        const finalStakedAmount = stakedAmount.lt(0) ? new Big(0) : stakedAmount;

        // Call API even if stakedAmount is 0 to get correct APR and reward
        // Convert to Wei (18 decimals) for API request
        const stakedAmountWei = finalStakedAmount.times(new Big(10).pow(18));
        // Use toFixed(0) to avoid scientific notation
        const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_STAKING_API_URL;
        if (!apiBaseUrl) {
          console.error('NEXT_PUBLIC_HPP_STAKING_API_URL is not set');
          if (!cancelled) {
            dispatch(setStakingFinalAPR(finalAPR));
            dispatch(setStakingExpectedReward('≈0 HPP'));
            dispatch(setStakingExpectedRewardLoading(false));
          }
          return;
        }
        const resp = await axios.get(`${apiBaseUrl}/apr/wallet/${address}?stakedAmount=${stakedAmountWei.toFixed(0)}`, {
          headers: { accept: 'application/json' },
        });
        const data: any = resp?.data ?? {};
        const d = data?.data ?? {};
        if (!cancelled && data?.success && d) {
          // Use finalAPR if available, otherwise use totalAPR
          if (typeof d.finalAPR === 'number') {
            dispatch(setStakingFinalAPR(d.finalAPR));
          } else if (typeof d.totalAPR === 'number') {
            dispatch(setStakingFinalAPR(d.totalAPR));
          } else {
            // Fallback to calculator's finalAPR if API doesn't return APR
            dispatch(setStakingFinalAPR(finalAPR));
          }
          // Set expectedReward from API (convert from Wei to human-readable format)
          if (typeof d.expectedReward === 'string' || typeof d.expectedReward === 'number') {
            const rewardWei = new Big(d.expectedReward.toString());
            const decimals = 18;
            const reward = rewardWei.div(new Big(10).pow(decimals));
            const displayDecimals = reward.gte(1000) ? 0 : 2;
            dispatch(setStakingExpectedReward(`≈${formatTokenBalance(reward.toString(), displayDecimals)} HPP`));
          } else {
            // If API doesn't return expectedReward, set to 0
            dispatch(setStakingExpectedReward('≈0 HPP'));
          }
        } else {
          // If API fails, fallback to calculator's finalAPR
          if (!cancelled) {
            dispatch(setStakingFinalAPR(finalAPR));
            dispatch(setStakingExpectedReward('≈0 HPP'));
          }
        }
      } catch {
        // If API fails, fallback to finalAPR
        if (!cancelled) {
          dispatch(setStakingFinalAPR(finalAPR));
          dispatch(setStakingExpectedReward('≈0 HPP'));
        }
      } finally {
        // Clear loading state
        if (!cancelled) dispatch(setStakingExpectedRewardLoading(false));
      }
    }, 500); // 500ms debounce

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [amount, stakedTotal, activeTab, isConnected, address, inputError, finalAPR]);

  // APR and Reward display (use stakingFinalAPR for Staking, separate from APR Calculator's finalAPR)
  const DEFAULT_APR_ENV = Number(process.env.NEXT_PUBLIC_STAKING_APR ?? process.env.NEXT_PUBLIC_DEFAULT_APR ?? NaN);
  // Use stakingFinalAPR for Expected APR - it should be dynamic based on staking input amount + stakedTotal
  const expectedAprPercent = useMemo(() => {
    // Use stakingFinalAPR (calculated based on staking input amount + staked total)
    if (Number.isFinite(stakingFinalAPR) && stakingFinalAPR > 0) {
      return Math.max(0, Math.min(100, stakingFinalAPR));
    }
    const fallback =
      (Number.isFinite(DEFAULT_APR_ENV) && DEFAULT_APR_ENV! > 0 ? DEFAULT_APR_ENV! : undefined) ??
      (Number.isFinite(aprTotal) ? aprTotal : 10);
    return Math.max(0, Math.min(100, fallback as number));
  }, [DEFAULT_APR_ENV, aprTotal, stakingFinalAPR]);
  // Format APR: show decimal only if it exists, otherwise show integer
  const formatApr = useCallback((apr: number) => {
    const rounded = Math.round(apr * 10) / 10; // Round to 1 decimal place
    if (rounded % 1 === 0) {
      return `${Math.round(rounded)}`;
    }
    return rounded.toFixed(1);
  }, []);

  const expectedAprDisplay = useMemo(() => `≈${formatApr(expectedAprPercent)}%`, [expectedAprPercent, formatApr]);
  const totalStakedAmountWithInput = useMemo(() => {
    if (!isConnected) return '- HPP';
    try {
      const baseStaked = new Big((stakedTotal || '0').replace(/,/g, '') || '0');
      // Don't add amount if there's an input error
      if (inputError) {
        return `${formatTokenBalance(baseStaked.toString(), 3)} HPP`;
      }
      const inputAmt = new Big((amount || '0').replace(/,/g, '') || '0');
      const totalAmt = baseStaked.plus(inputAmt);
      return `${formatTokenBalance(totalAmt.toString(), 3)} HPP`;
    } catch {
      return `${stakedTotal} HPP`;
    }
  }, [isConnected, amount, stakedTotal, inputError]);
  const totalStakedAmountAfterUnstake = useMemo(() => {
    if (!isConnected) return '- HPP';
    try {
      const baseStaked = new Big((stakedTotal || '0').replace(/,/g, '') || '0');
      // Don't subtract amount if there's an input error
      if (inputError) {
        return `${formatTokenBalance(baseStaked.toString(), 3)} HPP`;
      }
      const inputAmt = new Big((amount || '0').replace(/,/g, '') || '0');
      const totalAmt = baseStaked.minus(inputAmt);
      // Ensure it doesn't go below 0
      const finalAmt = totalAmt.lt(0) ? new Big(0) : totalAmt;
      return `${formatTokenBalance(finalAmt.toString(), 3)} HPP`;
    } catch {
      return `${stakedTotal} HPP`;
    }
  }, [isConnected, amount, stakedTotal, inputError]);
  const expectedAnnualReward = useMemo(() => {
    // Use API response for stake/unstake tabs, otherwise calculate
    if ((activeTab === 'stake' || activeTab === 'unstake') && stakingExpectedReward) {
      return stakingExpectedReward;
    }
    try {
      const baseStaked = new Big((stakedTotal || '0').replace(/,/g, '') || '0');
      const inputAmt = new Big((amount || '0').replace(/,/g, '') || '0');
      const totalAmt = baseStaked.plus(inputAmt);
      const reward = totalAmt.times(expectedAprPercent).div(100);
      const decimals = reward.gte(1000) ? 0 : 2;
      return `≈${formatTokenBalance(reward.toString(), decimals)} HPP`;
    } catch {
      return '≈0 HPP';
    }
  }, [activeTab, stakingExpectedReward, amount, stakedTotal, expectedAprPercent]);

  // Tabs are rendered inline in JSX (no separate components) for simplicity
  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-x-hidden">
      <Head>
        <link rel="preload" href="/lotties/Loading.lottie" as="fetch" crossOrigin="anonymous" />
      </Head>
      <Header
        onMenuClick={() => dispatch(setSidebarOpen(true))}
        isSidebarOpen={sidebarOpen}
        onBackClick={() => dispatch(setSidebarOpen(false))}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          navItems={navItems}
          legalLinks={legalLinks}
          isOpen={sidebarOpen}
          onClose={() => dispatch(setSidebarOpen(false))}
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
              <div className="px-5 max-w-6xl mx-auto text-center">
                <div className="flex justify-center">
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
                <div className="text-[50px] leading-[1.5] font-[900] text-white text-center">HPP Staking</div>
                <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-5xl text-center">
                  Stake your HPP to earn rewards and participate in HPP ecosystem
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="mt-20 px-5 max-w-6xl mx-auto w-full">
              <div className="flex items-center gap-2.5">
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
                      onClick={() => dispatch(setTopTab(id))}
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
                                onClick={() => dispatch(setActiveTab(id))}
                              >
                                {label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      {(activeTab === 'stake' || activeTab === 'unstake') && (
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
                                  onClick={() => (activeTab === 'stake' ? setPercent(p) : setUnstakePercent(p))}
                                  className="bg-white text-black rounded-full px-5 py-2 text-base font-normal leading-[1] cursor-pointer transition-opacity duration-200 hover:opacity-90 focus:outline-none focus:ring-0 focus-visible:outline-none focus:shadow-none"
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-5">
                            <div className="flex items-center justify-between text-base text-white leading-[1.2] tracking-[0.8px] font-normal">
                              <span>Total</span>
                              <span>
                                {activeTab === 'stake' ? totalStakedAmountWithInput : totalStakedAmountAfterUnstake}
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-1 min-[800px]:grid-cols-2 gap-2.5 justify-items-stretch">
                              <div className="w-full rounded-[5px] bg-white/10 p-5 text-center">
                                <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                                  Expected APR
                                </div>
                                <div className="text-white text-xl leading-[1.2] tracking-[0.8px] font-semibold mt-1">
                                  {stakingExpectedRewardLoading ? (
                                    <div className="flex items-center justify-center">
                                      <DotLottieReact
                                        src="/lotties/Loading.lottie"
                                        autoplay
                                        loop
                                        style={{ width: 24, height: 24 }}
                                      />
                                    </div>
                                  ) : (
                                    expectedAprDisplay
                                  )}
                                </div>
                              </div>
                              <div className="w-full rounded-[5px] bg-white/10 p-5 text-center">
                                <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                                  Expected Annual Reward
                                </div>
                                <div className="text-white text-xl leading-[1.2] tracking-[0.8px] font-semibold mt-1">
                                  {stakingExpectedRewardLoading ? (
                                    <div className="flex items-center justify-center">
                                      <DotLottieReact
                                        src="/lotties/Loading.lottie"
                                        autoplay
                                        loop
                                        style={{ width: 24, height: 24 }}
                                      />
                                    </div>
                                  ) : (
                                    expectedAnnualReward
                                  )}
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
                                  (activeTab === 'stake' ? isHppBalanceLoading : isStakedTotalLoading) ||
                                  !!inputError ||
                                  !amount ||
                                  amount === '.' ||
                                  (activeTab === 'stake'
                                    ? Number(amount) <= 0
                                    : Number((amount || '0').replace(/,/g, '')) <= 0)
                                }
                                fullWidth
                                className={`${
                                  isSubmitting ||
                                  (activeTab === 'stake' ? isHppBalanceLoading : isStakedTotalLoading) ||
                                  !!inputError ||
                                  !amount ||
                                  amount === '.' ||
                                  (activeTab === 'stake'
                                    ? Number(amount) <= 0
                                    : Number((amount || '0').replace(/,/g, '')) <= 0)
                                    ? '!bg-[#9E9E9E] !text-white'
                                    : ''
                                } !rounded-[5px] disabled:!opacity-100 disabled:!text-white`}
                                onClick={activeTab === 'stake' ? onStake : onUnstake}
                              >
                                {isSubmitting
                                  ? 'Processing...'
                                  : activeTab === 'stake'
                                  ? inputError || 'Stake'
                                  : 'Unstake'}
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
                <OverviewSection />
              ) : (
                <DashboardSection />
              )}
            </div>
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
