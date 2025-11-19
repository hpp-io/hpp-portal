'use client';

import React, { useState } from 'react';
import dayjs from '@/lib/dayjs';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Button from '@/components/ui/Button';
import WalletButton from '@/components/ui/WalletButton';
import { WalletIcon, HPPLogoIcon, HPPTickerIcon, InfoIcon } from '@/assets/icons';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import Big from 'big.js';
import { navItems, communityLinks } from '@/config/navigation';
import { standardArbErc20Abi, hppStakingAbi } from './abi';
import { formatDisplayAmount, PERCENTS, computePercentAmount, formatTokenBalance } from '@/lib/helpers';
import { useHppPublicClient, useHppChain } from './hppClient';
import { useToast } from '@/hooks/useToast';
import { useEnsureChain } from '@/lib/wallet';

type StakingTab = 'stake' | 'unstake' | 'claim';

export default function StakingClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StakingTab>('stake');
  const [amount, setAmount] = useState<string>('');
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
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
  const [isClaimInfoOpen, setIsClaimInfoOpen] = useState<boolean>(false);
  const [claimInfoPos, setClaimInfoPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const claimInfoRef = React.useRef<HTMLDivElement | null>(null);
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
  React.useEffect(() => {
    if (!isClaimInfoOpen) return;
    const onDown = (e: MouseEvent) => {
      if (claimInfoRef.current && !claimInfoRef.current.contains(e.target as Node)) {
        setIsClaimInfoOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isClaimInfoOpen]);
  // Read cooldown duration (seconds) from staking contract
  const fetchCooldownDuration = React.useCallback(async () => {
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
      if (activeTab === 'stake' && value.includes('.')) {
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
  const totalAfterStake = React.useMemo(() => {
    try {
      const base = new Big((stakedTotal || '0').replace(/,/g, '') || '0');
      const add = new Big((amount && amount !== '.' ? amount : '0').replace(/,/g, '') || '0');
      const sum = base.plus(add);
      return `${formatTokenBalance(sum.toString(), 2)} HPP`;
    } catch {
      return `${stakedTotal} HPP`;
    }
  }, [stakedTotal, amount]);

  React.useEffect(() => {
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
  const fetchHppBalance = React.useCallback(async () => {
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
  const fetchStakedTotal = React.useCallback(async () => {
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
      const formatted = formatTokenBalance(value, 2);
      setStakedTotal(formatted);
    } catch (_e) {
      setStakedTotal('0');
    } finally {
      setIsStakedTotalLoading(false);
    }
  }, [publicClient, address, isConnected, HPP_STAKING_ADDRESS]);

  // Fetch cooldown entries for claim history
  const fetchCooldowns = React.useCallback(async () => {
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
        const amountStr = formatTokenBalance(formatUnits(amountBn, DECIMALS), 2);
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
      await ensureHppChain();
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

      // Ensure HPP chain
      await ensureHppChain();
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
      await ensureHppChain();
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

  const formatRemaining = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (sec > 0 || parts.length === 0) parts.push(`${sec}s`);
    return parts.join(' ');
  };

  // Local date formatter (YYYY-MM-DD HH:mm) in user's timezone via dayjs
  const formatLocalDateTime = (epochSeconds: number) => dayjs.unix(epochSeconds).format('YYYY-MM-DD HH:mm');

  // Duration formatter for cooldownSeconds (minutes, hours, days, months) via dayjs
  const formatCooldownDuration = (totalSeconds: number) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    if (!s) return '';
    return dayjs.duration(s, 'seconds').humanize();
  };

  // Derived withdrawable from cooldowns (updates per second without needing new block)
  const derivedWithdrawableWei = React.useMemo(() => {
    if (!cooldowns?.length) return BigInt(0);
    return cooldowns.reduce((acc, c) => (c.unlock <= nowSecTick ? acc + (c.amountWei || BigInt(0)) : acc), BigInt(0));
  }, [cooldowns, nowSecTick]);
  const derivedWithdrawable = React.useMemo(() => {
    const val = formatUnits(derivedWithdrawableWei, DECIMALS);
    return formatTokenBalance(val, 2);
  }, [derivedWithdrawableWei]);

  const TabButton = ({ id, label }: { id: StakingTab; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={[
        'w-full px-5 py-3 rounded-[5px] text-base font-semibold transition-colors',
        activeTab === id ? '!bg-white !text-black' : 'bg-[#121212] text-white hover:bg-[#1a1a1a]',
        'cursor-pointer',
      ].join(' ')}
      aria-pressed={activeTab === id}
    >
      {label}
    </button>
  );

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
          communityLinks={communityLinks}
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
            <div className="bg-[#121212] border-b border-[#161616] py-7.5">
              <div className="px-4 max-w-6xl mx-auto">
                <h1 className="text-[50px] leading-[1.5] font-[900] text-white text-center">HPP Staking</h1>
                <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-5xl text-center">
                  Stake your HPP to earn rewards and participate in HPP ecosystem
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 max-w-6xl mx-auto w-full">
              <div className="max-w-[680px] mx-auto w-full">
                {/* Connected wallet banner */}
                {isConnected && (
                  <div className="my-5 rounded-lg p-4 border border-dashed border-white/50">
                    <div className="flex flex-col items-center text-center min-[810px]:flex-row min-[810px]:items-center min-[810px]:justify-between min-[810px]:text-left">
                      <div className="flex flex-col items-center min-[810px]:flex-row min-[810px]:items-center min-[810px]:space-x-4 mb-4 min-[810px]:mb-0">
                        <WalletIcon className="hidden min-[810px]:block w-12 h-12 text-white" />
                        <div className="flex flex-col items-center min-[810px]:items-start">
                          <div className="flex items-center gap-2.5 mb-2">
                            <WalletIcon className="w-5.5 h-5.5 text-white min-[810px]:hidden" />
                            <span className="text-white font-semibold text-xl tracking-[0.8px] leading-[1.5em]">
                              Wallet Connected
                            </span>
                          </div>
                          <div
                            className="text-base text-white font-normal tracking-[0.8px] leading-[1.5em] max-w-full text-center min-[810px]:text-left"
                            style={{ wordBreak: 'break-all', overflowWrap: 'break-word', whiteSpace: 'normal' }}
                          >
                            {address}
                          </div>
                        </div>
                      </div>
                      <Button variant="white" size="md" onClick={() => disconnect?.()} className="cursor-pointer">
                        Disconnect
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <div className="grid grid-cols-3 gap-2.5 bg-black w-full">
                  <TabButton id="stake" label="Stake" />
                  <TabButton id="unstake" label="Unstake" />
                  <TabButton id="claim" label="Claim" />
                </div>

                {/* Panel */}
                <div
                  className={`mt-2.5 w-full mb-25 ${
                    isConnected && activeTab === 'claim' ? '' : 'rounded-[5px] p-6 min-[1200px]:p-8 bg-primary'
                  }`}
                >
                  {!isConnected ? (
                    <div className="text-center">
                      <p className="text-white text-base leading-[1.2] tracking-[0.8px] mb-5">
                        No wallet has been connected.
                      </p>
                      <WalletButton size="lg" />
                    </div>
                  ) : (
                    <div>
                      {activeTab === 'stake' && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                              Staking Available:
                            </h3>
                            <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                              {`${hppBalance} HPP`}
                              {/* {isHppBalanceLoading ? 'Loading...' : `${hppBalance} HPP`} */}
                            </div>
                          </div>

                          <div className="rounded-[5px] bg-white flex items-center justify-between px-4 py-3">
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="\\d*\\.?\\d*"
                              min="0"
                              className={`bg-transparent outline-none ${
                                inputError ? 'text-[#FF1312] bg-[#FF1312]/10' : 'text-black'
                              } text-base leading-[1.2] tracking-[0.8px] font-normal w-full ${
                                inputError ? 'outline-red-500' : ''
                              }`}
                              value={formatDisplayAmount(amount)}
                              placeholder="0.0"
                              onChange={(e) => handleAmountChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              onWheel={(e) => {
                                (e.target as HTMLInputElement).blur();
                              }}
                            />
                            <span className="ml-3 text-black text-sm font-semibold cursor-default select-none">
                              HPP
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-3 mt-3">
                            {PERCENTS.map((p) => (
                              <button
                                key={p}
                                onClick={() => setPercent(p)}
                                className="bg-white text-black rounded-[5px] py-2 font-semibold cursor-pointer transition-opacity duration-200 hover:opacity-90"
                              >
                                {Math.round(p * 100)}%
                              </button>
                            ))}
                          </div>

                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-base text-white leading-[1.2] tracking-[0.8px] font-normal">
                              <span>Total:</span>
                              <span>{inputError ? `${stakedTotal} HPP` : totalAfterStake}</span>
                            </div>
                            <div className="text-base text-[#5DF23F] leading-[1.2] tracking-[0.8px] font-normal mt-2.5">
                              HPP will be available to withdraw {formatCooldownDuration(cooldownSeconds)} after
                              unstaking.
                            </div>
                          </div>

                          <div className="mt-5">
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
                          </div>
                        </>
                      )}

                      {activeTab === 'unstake' && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                              Unstaking Available:
                            </h3>
                            <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                              {`${stakedTotal} HPP`}
                              {/* {isStakedTotalLoading ? 'Loading...' : `${stakedTotal} HPP`} */}
                            </div>
                          </div>

                          <div className="rounded-[5px] bg-white flex items-center justify-between px-4 py-3">
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="\\d*\\.?\\d*"
                              min="0"
                              className={`bg-transparent outline-none ${
                                inputError ? 'text-[#FF1312] bg-[#FF1312]/10' : 'text-black'
                              } text-base leading-[1.2] tracking-[0.8px] font-normal w-full`}
                              value={formatDisplayAmount(amount)}
                              placeholder="0.0"
                              onChange={(e) => handleAmountChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              onWheel={(e) => {
                                (e.target as HTMLInputElement).blur();
                              }}
                            />
                            <span className="ml-3 text-black text-sm font-semibold cursor-default select-none">
                              HPP
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-3 mt-3">
                            {PERCENTS.map((p) => (
                              <button
                                key={p}
                                onClick={() => setUnstakePercent(p)}
                                className="bg-white text-black rounded-[5px] py-2 font-semibold cursor-pointer transition-opacity duration-200 hover:opacity-90"
                              >
                                {Math.round(p * 100)}%
                              </button>
                            ))}
                          </div>

                          <div className="mt-5">
                            <div className="text-base text-[#5DF23F] leading-[1.2] tracking-[0.8px] font-normal mt-2.5">
                              HPP will be available to withdraw {formatCooldownDuration(cooldownSeconds)} after
                              unstaking.
                            </div>
                          </div>

                          <div className="mt-5">
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
                          </div>
                        </>
                      )}

                      {activeTab === 'claim' && (
                        <>
                          {/* Claim Available Card */}
                          <div className="rounded-[5px] p-6 min-[1200px]:p-8 bg-primary">
                            <div className="flex items-center gap-2.5">
                              <h3 className="text-white text-base font-normal leading-[1.2] tracking-[0.8px]">
                                Claim Available
                              </h3>
                              <button
                                type="button"
                                aria-label="Claim info"
                                onClick={(e) => {
                                  const margin = 12;
                                  const width = 320; // approximate popover width
                                  const height = 180; // approximate popover height
                                  const maxLeft = Math.max(0, window.innerWidth - width - margin);
                                  const maxTop = Math.max(0, window.innerHeight - height - margin);
                                  const x = Math.min(e.clientX + margin, maxLeft);
                                  const y = Math.min(e.clientY + margin, maxTop);
                                  setClaimInfoPos({ x, y });
                                  setIsClaimInfoOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <InfoIcon className="w-5.5 h-5.5" />
                              </button>
                            </div>
                            <div className="flex items-center justify-center gap-2.5 mt-4 mb-4">
                              <HPPTickerIcon className="w-5.5 h-5.5" />
                              <span className="text-white text-[25px] font-semibold leading-[1.2] tracking-[0.8px]">
                                {derivedWithdrawable}
                              </span>
                            </div>

                            <div className="mt-4">
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
                            </div>
                          </div>

                          {/* Transactions - Card 2 */}
                          <div className="mt-2.5 rounded-[5px] p-6 min-[1200px]:p-8 bg-primary">
                            <div className="space-y-2.5">
                              {(isCooldownsLoading || !cooldownsInitialized) && (
                                <div className="flex flex-col items-center justify-center py-8 bg-[rgba(18,18,18,0.1)] rounded-[5px]">
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
                                <div className="flex flex-col items-center justify-center py-8 bg-[rgba(18,18,18,0.1)] rounded-[5px]">
                                  <p className="text-base text-[#bfbfbf] tracking-[0.8px] leading-[1.5] text-center font-normal">
                                    No claim history.
                                  </p>
                                </div>
                              )}
                              {!isCooldownsLoading &&
                                cooldownsInitialized &&
                                cooldowns.map((tx, idx) => (
                                  <div key={idx} className="rounded-[5px] bg-[#3f43aa]/60 px-4 py-3">
                                    <div className="flex flex-col gap-2.5">
                                      <div className="flex items-center justify-between">
                                        <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                                          {tx.date}
                                        </div>
                                        <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                                          {tx.amount}
                                        </div>
                                      </div>
                                      <div
                                        className={
                                          tx.cooling
                                            ? 'text-[#25FF21] text-base leading-[1.2] tracking-[0.8px] font-normal'
                                            : 'text-white text-base leading-[1.2] tracking-[0.8px] font-normal'
                                        }
                                      >
                                        {tx.cooling
                                          ? `You will be able to claim in ${formatRemaining(tx.unlock - nowSecTick)}`
                                          : 'You are able to claim.'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Footer />
        </main>
      </div>
      {/* Claim Info Popover */}
      {isClaimInfoOpen && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/50"
            onClick={() => setIsClaimInfoOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed z-[100]"
            style={{ top: claimInfoPos.y, left: claimInfoPos.x }}
            role="dialog"
            aria-modal="true"
          >
            <div
              ref={claimInfoRef}
              className="relative w-[360px] max-w-[90vw] rounded-[5px] bg-primary text-white py-7.5 px-5 shadow-xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold leading-[1.5] tracking-[0]">Claim</h2>
                <button
                  type="button"
                  aria-label="Close"
                  className="text-white cursor-pointer"
                  onClick={() => setIsClaimInfoOpen(false)}
                >
                  <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-base leading-[1.5] tracking-[0] mb-5">
                After unstaking, you can claim your tokens after a {formatCooldownDuration(cooldownSeconds)} cooldown.
              </p>
              <p className="text-base leading-[1.5] tracking-[0]">
                When the cooldown is over, your tokens will be accumulated to ‘Claim Available.’
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
