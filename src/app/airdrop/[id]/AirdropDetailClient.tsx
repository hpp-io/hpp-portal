'use client';

import React, { useState, useEffect, useMemo } from 'react';
import '@reown/appkit-ui';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Button from '@/components/ui/Button';
import WalletButton from '@/components/ui/WalletButton';
import { navItems, legalLinks } from '@/config/navigation';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';
import { getWalletClient } from '@wagmi/core';
import Image from 'next/image';
import { useAppKit } from '@reown/appkit/react';
import axios from 'axios';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { HPPTickerIcon } from '@/assets/icons';
import FaqSection from '@/components/ui/Faq';
import DontMissAirdrop from '@/components/ui/DontMissAirdrop';
import { airdropData } from '@/static/uiData';
import { formatUnits } from 'viem';
import { useHppPublicClient, useHppChain } from '@/app/staking/hppClient';
import { formatTokenBalance } from '@/lib/helpers';
import Big from 'big.js';
import dayjs from '@/lib/dayjs';
import { hppVestingABI } from '../abi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAirdropDetailLoading, setAirdropDetail, type AirdropDetailData } from '@/store/slices';
import { useToast } from '@/hooks/useToast';
import { useEnsureChain } from '@/lib/wallet';
import { config as wagmiConfig } from '@/config/walletConfig';

export default function AirdropDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { showToast, hideToast } = useToast();
  const ensureChain = useEnsureChain();
  const [error, setError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [vestingSchedule, setVestingSchedule] = useState<[`0x${string}`, bigint, bigint, boolean] | null>(null);
  const [claimableAmountRaw, setClaimableAmountRaw] = useState<bigint | null>(null);
  const [isVestingLoading, setIsVestingLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [successModal, setSuccessModal] = useState<null | { variant: 'claim' | 'claimAndStake'; amount: string }>(
    null
  );
  const [historyItems, setHistoryItems] = useState<
    Array<{ id: string; date: string; action: string; amount?: string; status?: string; isLocal?: boolean }>
  >([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const avatarRef = React.useRef<any>(null);

  // Get airdrop detail from Redux
  const airdropState = useAppSelector((state) => state.airdrop);
  const cachedDetail = airdropState.details[id];
  const isDetailLoading = airdropState.detailLoading[id] || false;
  const detailLastFetched = airdropState.detailLastFetched[id];

  // Try to infer airdrop type from the cached events list (used for the type endpoint)
  const inferredAirdropType = useMemo<'hpp' | 'dapp' | 'collaboration'>(() => {
    if (airdropState.events.hpp?.some((e) => e.id === id)) return 'hpp';
    if (airdropState.events.dapp?.some((e) => e.id === id)) return 'dapp';
    if (airdropState.events.collaboration?.some((e) => e.id === id)) return 'collaboration';
    return 'hpp';
  }, [airdropState.events, id]);

  // Convert Redux detail to AirdropDetail format
  const airdropDetail = useMemo(() => {
    if (!cachedDetail) return null;
    return {
      ...cachedDetail,
      icon: HPPTickerIcon,
    };
  }, [cachedDetail]);

  // HPP network public client
  const publicClient = useHppPublicClient();
  const { id: HPP_CHAIN_ID, chain: hppChain, rpcUrl } = useHppChain();
  const explorerBase = useMemo(
    () => (HPP_CHAIN_ID === 190415 ? 'https://explorer.hpp.io' : 'https://sepolia-explorer.hpp.io'),
    [HPP_CHAIN_ID]
  );

  // Ensure wallet is connected to HPP network for writes
  const ensureHppChain = React.useCallback(async () => {
    await ensureChain(HPP_CHAIN_ID, {
      chainName: hppChain.name,
      rpcUrls: [rpcUrl],
      nativeCurrency: hppChain.nativeCurrency,
    });
  }, [ensureChain, HPP_CHAIN_ID, hppChain.name, hppChain.nativeCurrency, rpcUrl]);

  // Contract address: use API/Redux data (do not override with env).
  const contractAddress = useMemo(() => {
    // Prefer detail payload
    const fromDetail = cachedDetail?.contract;
    if (fromDetail) {
      const normalized = String(fromDetail).trim().toLowerCase();
      if (normalized !== 'none') return fromDetail as `0x${string}`;
    }

    // Fallback: list payload (if it included contract/contractAddress)
    const fromEvents =
      airdropState.events.hpp?.find((e) => e.id === id)?.contract ??
      airdropState.events.dapp?.find((e) => e.id === id)?.contract ??
      airdropState.events.collaboration?.find((e) => e.id === id)?.contract;

    if (fromEvents) {
      const normalized = String(fromEvents).trim().toLowerCase();
      if (normalized !== 'none') return fromEvents as `0x${string}`;
    }

    return '' as `0x${string}`;
  }, [cachedDetail?.contract, airdropState.events, id]);

  // Fetch vesting schedule from contract
  const fetchVestingSchedule = React.useCallback(async () => {
    if (!isConnected || !address || !contractAddress) {
      setVestingSchedule(null);
      setClaimableAmountRaw(null);
      setIsVestingLoading(false);
      return;
    }

    try {
      setIsVestingLoading(true);
      const [scheduleResult, claimableResult] = await Promise.all([
        publicClient.readContract({
        address: contractAddress,
        abi: hppVestingABI,
        functionName: 'getVestingSchedule',
        args: [address],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: hppVestingABI,
          functionName: 'getClaimableAmount',
          args: [address],
        }),
      ]);

      setVestingSchedule(scheduleResult as unknown as [`0x${string}`, bigint, bigint, boolean]);
      setClaimableAmountRaw(claimableResult as unknown as bigint);
    } catch (error) {
      console.error('Failed to fetch vesting schedule:', error);
      setVestingSchedule(null);
      setClaimableAmountRaw(null);
    } finally {
      setIsVestingLoading(false);
    }
  }, [isConnected, address, contractAddress, publicClient]);

  // Fetch vesting schedule when wallet connects or address changes
  useEffect(() => {
    fetchVestingSchedule();
  }, [fetchVestingSchedule]);

  // Parse vesting schedule data
  const vestingData = useMemo(() => {
    if (!vestingSchedule) return null;
    
    // Handle both array and object formats
    let beneficiary: `0x${string}`;
    let totalAmount: bigint;
    let claimedAmount: bigint;
    let isActive: boolean;
    
    if (Array.isArray(vestingSchedule)) {
      // Tuple format: [beneficiary, totalAmount, claimedAmount, isActive]
      [beneficiary, totalAmount, claimedAmount, isActive] = vestingSchedule;
    } else {
      // Object format (if viem returns it as an object)
      // Use nullish coalescing (??) instead of || because bigint `0n` is falsy.
      beneficiary = (vestingSchedule as any).beneficiary ?? (vestingSchedule as any)[0];
      totalAmount = (vestingSchedule as any).totalAmount ?? (vestingSchedule as any)[1];
      claimedAmount = (vestingSchedule as any).claimedAmount ?? (vestingSchedule as any)[2];
      isActive = (vestingSchedule as any).isActive ?? (vestingSchedule as any)[3];
    }

    // Defensive: if the contract response is missing fields, avoid crashing formatUnits/Big.
    const totalAmountSafe = typeof totalAmount === 'bigint' ? totalAmount : BigInt(0);
    const claimedAmountSafe = typeof claimedAmount === 'bigint' ? claimedAmount : BigInt(0);
    const claimableSafe = typeof claimableAmountRaw === 'bigint' ? claimableAmountRaw : BigInt(0);

    // On-chain meaning:
    // - claimedAmount: already claimed
    // - claimableAmount: currently vested but not yet claimed
    // So "vested so far" = claimed + claimable
    const vestedAmountSafe = claimedAmountSafe + claimableSafe;
    const notVestedAmountSafe = totalAmountSafe > vestedAmountSafe ? totalAmountSafe - vestedAmountSafe : BigInt(0);
    
    const totalAmountStr = formatUnits(totalAmountSafe, 18);
    const claimedAmountStr = formatUnits(claimedAmountSafe, 18);
    const claimableAmountStr = formatUnits(claimableSafe, 18);
    const vestedAmountStr = formatUnits(vestedAmountSafe, 18);
    const notVestedAmountStr = formatUnits(notVestedAmountSafe, 18);
    
    return {
      beneficiary,
      totalAmount: totalAmountStr,
      claimedAmount: claimedAmountStr,
      claimableAmount: claimableAmountStr,
      vestedAmount: vestedAmountStr,
      notVestedAmount: notVestedAmountStr,
      isActive,
    };
  }, [vestingSchedule, claimableAmountRaw]);

  // Claimable amount (vested-but-unclaimed) from contract
  const claimableAmount = useMemo(() => vestingData?.claimableAmount ?? null, [vestingData]);

  const fetchAirdropHistory = React.useCallback(async (opts?: { silent?: boolean }) => {
    if (!isConnected || !address || !contractAddress) {
      setHistoryItems([]);
      setIsHistoryLoading(false);
      return;
    }
    const lambdaBase = process.env.NEXT_PUBLIC_HPP_BLOCKSCOUT_PROXY_URL;
    if (!lambdaBase) {
      console.error('NEXT_PUBLIC_HPP_BLOCKSCOUT_PROXY_URL is not defined');
      setIsHistoryLoading(false);
      return;
    }
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;
    const isMainnet = HPP_CHAIN_ID === 190415;
    const network = isMainnet ? 'mainnet' : 'sepolia';
    const baseUrl = `${lambdaBase}/blockscout/${network}/api/v2/addresses/${contractAddress}/transactions`;

    const isInternalServerError = (err: any): boolean => {
      return (
        err?.response?.status === 500 ||
        err?.response?.data?.message === 'Internal Server Error' ||
        err?.message?.includes('Internal Server Error')
      );
    };

    const retryApiCall = async (apiCall: () => Promise<any>, callRetryCount = 0): Promise<any> => {
      try {
        return await apiCall();
      } catch (err: any) {
        if (isInternalServerError(err) && callRetryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * (callRetryCount + 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return retryApiCall(apiCall, callRetryCount + 1);
        }
        throw err;
      }
    };

    try {
      const silent = !!opts?.silent;
      // Match staking Activity Log UX: don't flash full-page loader during background refresh/polling
      if (!silent && historyItems.length === 0) setIsHistoryLoading(true);
      let items: any[] = [];
      let nextUrl: string | null = baseUrl;
      let guard = 0;
      while (nextUrl && guard < 200) {
        const resp = await retryApiCall(() => axios.get(nextUrl!, { headers: { accept: 'application/json' } }));
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

      const walletLc = address.toLowerCase();
      const normalizeMethod = (raw: any) =>
        String(raw || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '');
      // For now, only show Claim history. (Future: add "Claim + Staking" etc. here.)
      const allowedMethods = new Set(['claimtokens', 'claimandstake']);
      const mapStatus = (it: any): string => {
        const res = String(it?.result || '').toLowerCase();
        const ok = String(it?.status || '').toLowerCase() === 'ok';
        const hasRevert = !!it?.revert_reason;
        return hasRevert || res === 'failed' ? 'Rejected' : ok && res === 'success' ? 'Completed' : 'Pending';
      };
      let mapped = Array.isArray(items)
        ? items
            .filter((it: any) => String(it?.from?.hash || '').toLowerCase() === walletLc)
            .filter((it: any) => {
              const method = normalizeMethod(it?.method || it?.decoded_input?.method_call || it?.decoded_input?.method);
              return allowedMethods.has(method);
            })
            .map((it: any) => {
              const method = normalizeMethod(it?.method || it?.decoded_input?.method_call || it?.decoded_input?.method);
              const action = method === 'claimandstake' ? 'Claim + Stake' : 'Claim';
              return {
                id: String(it.hash),
                date: dayjs(new Date(String(it.timestamp)).getTime()).format('YYYY-MM-DD HH:mm'),
                action,
                amount: undefined as string | undefined,
                status: mapStatus(it),
                isLocal: false,
              };
            })
            .sort((a: any, b: any) => {
              const dateA = new Date(a.date.replace(' ', 'T')).getTime();
              const dateB = new Date(b.date.replace(' ', 'T')).getTime();
              return dateB - dateA;
            })
        : [];

      // Backfill claimed amount from token transfers by tx hash (HPP token -> wallet, from contract)
      try {
        const needAmount = mapped.filter((m: any) => !m.amount);
        const tokenAddr = (process.env.NEXT_PUBLIC_HPP_TOKEN_CONTRACT || '').toLowerCase();
        const contractLc = String(contractAddress).toLowerCase();
        const stakingLc = String(process.env.NEXT_PUBLIC_HPP_STAKING_CONTRACT || '').toLowerCase();
        if (needAmount.length > 0 && tokenAddr) {
          const addrTUrl = `${lambdaBase}/blockscout/${network}/api/v2/addresses/${address}/token-transfers?type=`;
          const addrTResp = await retryApiCall(() => axios.get(addrTUrl, { headers: { accept: 'application/json' } }));
          const addrTItems: any[] = addrTResp?.data?.items ?? [];
          if (Array.isArray(addrTItems) && addrTItems.length > 0) {
            const byHashQuick = new Map<string, string>();
            for (const tr of addrTItems) {
              const tokenLc = String(tr?.token?.address_hash || '').toLowerCase();
              if (tokenLc !== tokenAddr) continue;
              const toLc = String(tr?.to?.hash || '').toLowerCase();
              const fromLc = String(tr?.from?.hash || '').toLowerCase();
              if (toLc !== walletLc) continue;
              if (fromLc && fromLc !== contractLc) continue; // prefer contract->wallet transfers
              const txHash = String(tr?.transaction_hash || tr?.tx_hash || tr?.hash || '');
              if (!txHash) continue;
              const dec =
                Number(tr?.token?.decimals) || Number(tr?.total?.decimals) || Number(tr?.token_decimals) || 18;
              const raw = String(tr?.total?.value ?? tr?.value ?? tr?.amount ?? '0');
              try {
                const units = formatUnits(BigInt(raw), Number.isFinite(dec) ? dec : 18);
                byHashQuick.set(txHash.toLowerCase(), `${formatTokenBalance(units, 2)} HPP`);
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
        }
      } catch {
        // ignore amount backfill failures
      }

      // If still missing amounts (e.g., Claim + Stake doesn't transfer to wallet), try tx-level token transfers (limited).
      try {
        const need = mapped.filter((m: any) => !m.amount).slice(0, 20);
        const tokenAddr = (process.env.NEXT_PUBLIC_HPP_TOKEN_CONTRACT || '').toLowerCase();
        const contractLc = String(contractAddress).toLowerCase();
        const stakingLc = String(process.env.NEXT_PUBLIC_HPP_STAKING_CONTRACT || '').toLowerCase();
        if (need.length > 0 && tokenAddr) {
          for (const m of need) {
            try {
              const url = `${lambdaBase}/blockscout/${network}/api/v2/transactions/${m.id}/token-transfers`;
              const resp = await retryApiCall(() => axios.get(url, { headers: { accept: 'application/json' } }));
              const tItems: any[] = resp?.data?.items ?? [];
              if (!Array.isArray(tItems) || tItems.length === 0) continue;
              // pick the HPP transfer that originated from this airdrop contract and went to wallet or staking
              const tr = tItems.find((x: any) => {
                const tokenLc = String(x?.token?.address_hash || '').toLowerCase();
                if (tokenLc !== tokenAddr) return false;
                const fromLc = String(x?.from?.hash || '').toLowerCase();
                const toLc = String(x?.to?.hash || '').toLowerCase();
                if (fromLc && fromLc !== contractLc) return false;
                return toLc === walletLc || (stakingLc ? toLc === stakingLc : false);
              });
              if (!tr) continue;
              const dec =
                Number(tr?.token?.decimals) || Number(tr?.total?.decimals) || Number(tr?.token_decimals) || 18;
              const raw = String(tr?.total?.value ?? tr?.value ?? tr?.amount ?? '0');
              const units = formatUnits(BigInt(raw), Number.isFinite(dec) ? dec : 18);
              const display = `${formatTokenBalance(units, 2)} HPP`;
              mapped = mapped.map((x: any) => (String(x.id).toLowerCase() === String(m.id).toLowerCase() ? { ...x, amount: display } : x));
            } catch {
              // ignore per-tx failures
            }
          }
        }
      } catch {
        // ignore tx transfer backfill failures
      }

      // Merge with local pending items (staking Activity Log behavior)
      setHistoryItems((prev) => {
        const localItems = prev.filter((h) => h.isLocal);
        const blockscoutIds = new Set(mapped.map((a: any) => String(a.id).toLowerCase()));
        const localToKeep = localItems.filter((local) => !blockscoutIds.has(String(local.id).toLowerCase()));
        return [...mapped, ...localToKeep].sort((a: any, b: any) => {
          const dateA = new Date(String(a.date || '').replace(' ', 'T')).getTime();
          const dateB = new Date(String(b.date || '').replace(' ', 'T')).getTime();
          if (dateA !== dateB) return dateB - dateA;
          if (a.isLocal && !b.isLocal) return -1;
          if (!a.isLocal && b.isLocal) return 1;
          return 0;
        });
      });
      setHistoryPage(1);
    } catch {
      // Preserve local items even if Blockscout fetch fails
      setHistoryItems((prev) => prev.filter((h) => h.isLocal));
    } finally {
      setIsHistoryLoading(false);
    }
  }, [isConnected, address, contractAddress, HPP_CHAIN_ID, historyItems.length]);

  // Fetch on-chain history when wallet or contract changes
  useEffect(() => {
    fetchAirdropHistory();
  }, [fetchAirdropHistory]);

  // Poll for history when there are local pending items (same as staking Activity Log)
  useEffect(() => {
    const localPending = historyItems.filter((h) => h.isLocal && h.status === 'Pending');
    if (localPending.length === 0) return;
    if (!isConnected || !address) return;
    const intervalId = setInterval(() => {
      fetchAirdropHistory({ silent: true });
    }, 5000);
    return () => clearInterval(intervalId);
  }, [historyItems, isConnected, address, fetchAirdropHistory]);

  const onClaimTokens = React.useCallback(async () => {
    try {
      if (!address || !isConnected) {
        open({ view: 'Connect' });
        return;
      }
      if (!contractAddress) {
        showToast('Error', 'Contract address is not available yet.', 'error');
        return;
      }
      if (!claimableAmount || new Big(claimableAmount).lte(0)) return;

      // Make sure wallet is on HPP network
      try {
        await ensureHppChain();
      } catch {
        showToast('Switch network', 'Please switch to HPP Network in your wallet and try again.', 'error');
        return;
      }

      const hppWalletClient =
        walletClient ?? (await getWalletClient(wagmiConfig, { account: address, chainId: HPP_CHAIN_ID }));

      setIsClaiming(true);
      showToast('Waiting for claim...', 'Please confirm in your wallet.', 'loading');

      const txHash = await hppWalletClient.writeContract({
        address: contractAddress,
        abi: hppVestingABI,
        functionName: 'claimTokens',
        args: [],
        account: address as `0x${string}`,
        chain: hppChain,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt.status === 'success') {
        hideToast();
        setIsClaimModalOpen(false);
        const amountNumeric = claimableAmount ? formatTokenBalance(claimableAmount, 2) : '0.00';
        setSuccessModal({ variant: 'claim', amount: amountNumeric });
        // Add local history immediately (Pending until indexed by Blockscout)
        const amountDisplay = claimableAmount ? `${formatTokenBalance(claimableAmount, 2)} HPP` : undefined;
        setHistoryItems((prev) => {
          const exists = prev.some((a) => String(a.id).toLowerCase() === String(txHash).toLowerCase());
          if (exists) return prev;
          return [
            {
              id: String(txHash),
              date: dayjs().format('YYYY-MM-DD HH:mm'),
              action: 'Claim',
              amount: amountDisplay,
              status: 'Pending',
              isLocal: true,
            },
            ...prev,
          ];
        });
        // Refresh on-chain amounts
        await fetchVestingSchedule();
        // Give Blockscout a moment to index, then refresh without flashing loader
        setTimeout(() => fetchAirdropHistory({ silent: true }), 2000);
      } else {
        showToast('Claim failed', 'Transaction was rejected or failed.', 'error');
      }
    } catch (_e) {
      showToast('Error', 'Failed to process claim request.', 'error');
    } finally {
      setIsClaiming(false);
    }
  }, [
    address,
    isConnected,
    open,
    contractAddress,
    claimableAmount,
    ensureHppChain,
    walletClient,
    HPP_CHAIN_ID,
    hppChain,
    publicClient,
    fetchVestingSchedule,
    fetchAirdropHistory,
    showToast,
    hideToast,
  ]);

  const onClaimAndStake = React.useCallback(async () => {
    try {
      if (!address || !isConnected) {
        open({ view: 'Connect' });
        return;
      }
      if (!contractAddress) {
        showToast('Error', 'Contract address is not available yet.', 'error');
        return;
      }
      if (!claimableAmount || new Big(claimableAmount).lte(0)) return;

      try {
        await ensureHppChain();
      } catch {
        showToast('Switch network', 'Please switch to HPP Network in your wallet and try again.', 'error');
        return;
      }

      const hppWalletClient =
        walletClient ?? (await getWalletClient(wagmiConfig, { account: address, chainId: HPP_CHAIN_ID }));

      setIsClaiming(true);
      showToast('Waiting for claim + stake...', 'Please confirm in your wallet.', 'loading');

      const txHash = await hppWalletClient.writeContract({
        address: contractAddress,
        abi: hppVestingABI,
        functionName: 'claimAndStake',
        args: [],
        account: address as `0x${string}`,
        chain: hppChain,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt.status === 'success') {
        hideToast();
        setIsClaimModalOpen(false);
        const amountNumeric = claimableAmount ? formatTokenBalance(claimableAmount, 2) : '0.00';
        setSuccessModal({ variant: 'claimAndStake', amount: amountNumeric });
        const amountDisplay = claimableAmount ? `${formatTokenBalance(claimableAmount, 2)} HPP` : undefined;
        setHistoryItems((prev) => {
          const exists = prev.some((a) => String(a.id).toLowerCase() === String(txHash).toLowerCase());
          if (exists) return prev;
          return [
            {
              id: String(txHash),
              date: dayjs().format('YYYY-MM-DD HH:mm'),
              action: 'Claim + Stake',
              amount: amountDisplay,
              status: 'Pending',
              isLocal: true,
            },
            ...prev,
          ];
        });
        await fetchVestingSchedule();
        setTimeout(() => fetchAirdropHistory({ silent: true }), 2000);
      } else {
        showToast('Claim + Stake failed', 'Transaction was rejected or failed.', 'error');
      }
    } catch {
      showToast('Error', 'Failed to process claim + stake request.', 'error');
    } finally {
      setIsClaiming(false);
    }
  }, [
    address,
    isConnected,
    open,
    contractAddress,
    claimableAmount,
    ensureHppChain,
    walletClient,
    HPP_CHAIN_ID,
    hppChain,
    publicClient,
    fetchVestingSchedule,
    fetchAirdropHistory,
    showToast,
    explorerBase,
    hideToast,
  ]);

  // Calculate progress bar percentages
  const progressData = useMemo(() => {
    if (!vestingData) return null;
    const total = new Big(vestingData.totalAmount);
    const vested = new Big(vestingData.vestedAmount);
    const claimed = new Big(vestingData.claimedAmount);
    const notVested = new Big(vestingData.notVestedAmount);
    
    if (total.eq(0)) return null;
    
    const notVestedPercent = total.gt(0) ? notVested.div(total).times(100).toNumber() : 0;
    const vestedPercent = total.gt(0) ? vested.div(total).times(100).toNumber() : 0;
    
    return {
      notVestedPercent,
      vestedPercent,
      totalAmount: formatTokenBalance(vestingData.totalAmount, 0),
      // Use decimals to avoid "floor(a+b) vs floor(a) + floor(b)" confusion in UI.
      vestedAmount: formatTokenBalance(vestingData.vestedAmount, 2),
      claimedAmount: formatTokenBalance(vestingData.claimedAmount, 2),
      notVestedAmount: formatTokenBalance(vestingData.notVestedAmount, 2),
    };
  }, [vestingData]);

  const historyPageCount = useMemo(
    () => Math.max(1, Math.ceil((historyItems?.length || 0) / 10)),
    [historyItems?.length]
  );

  // Computed values
  const shortAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 11)}...${address.slice(-9)}`;
  }, [address]);

  // Set avatar address
  useEffect(() => {
    if (avatarRef.current && address) {
      avatarRef.current.address = address;
      avatarRef.current.setAttribute('address', address);
    }
  }, [address]);

  // Parse markdown links in description
  const parseMarkdownLinks = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add the link
      parts.push(
        <a
          key={`link-${keyIndex++}`}
          href={match[2]}
          className="underline text-white hover:text-[#1998FF] transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  // Fetch airdrop detail from API (only if not cached or cache expired)
  useEffect(() => {
    const fetchAirdropDetail = async () => {
      if (!id) return;

      // Check if we have cached data that's still valid
      const now = Date.now();
      if (cachedDetail && detailLastFetched && now - detailLastFetched < CACHE_DURATION) {
        return; // Use cached data
      }

      try {
        dispatch(setAirdropDetailLoading({ id, loading: true }));
        setError(null);

        const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_STAKING_API_URL;
        if (!apiBaseUrl) {
          console.error('NEXT_PUBLIC_HPP_STAKING_API_URL is not set');
          setError('API configuration error');
          dispatch(setAirdropDetailLoading({ id, loading: false }));
          return;
        }

        // Use the type endpoint with id query, e.g. /api/airdrop/type/hpp?id=...
        const response = await axios.get(`${apiBaseUrl}/airdrop/type/${inferredAirdropType}`, {
          params: { id },
          headers: { accept: 'application/json' },
        });

        // Handle different response structures
        let detailData: any = null;
        const raw = response.data;
        if (raw?.data) {
          // Common API shape: { success: true, data: [...] } or { data: {...} }
          if (Array.isArray(raw.data)) {
            detailData = raw.data[0] ?? null;
          } else {
            detailData = raw.data;
          }
        } else if (Array.isArray(raw)) {
          // some APIs return an array even for id-filtered requests
          detailData = raw[0] ?? null;
        } else if (raw && typeof raw === 'object') {
          detailData = raw;
        }

        if (detailData) {
          // Map API response to AirdropDetailData format (without icon)
          const detail: AirdropDetailData = {
            id: detailData.id ?? id,
            name: detailData.name ?? 'Unknown Airdrop',
            eventName: detailData.eventName ?? detailData.name ?? 'HPP',
            reward: detailData.reward ?? 0,
            starts: detailData.starts ?? detailData.claimPeriodStart ?? '-',
            ends: detailData.ends ?? detailData.claimPeriodEnd ?? '-',
            status: detailData.status ?? 'Coming Soon',
            description: detailData.description ?? '',
            claimPeriodStart: detailData.claimPeriodStart ?? detailData.starts ?? '-',
            claimPeriodEnd: detailData.claimPeriodEnd ?? detailData.ends ?? '-',
            vestingPeriodStart: detailData.vestingPeriodStart ?? '-',
            vestingPeriodEnd: detailData.vestingPeriodEnd ?? '-',
            vestingDuration: detailData.vestingDuration ?? '-',
            eligibilityDescription: detailData.eligibilityDescription ?? '',
            governanceVoteLink: detailData.governanceVoteLink,
            governanceVoteText: detailData.governanceVoteText,
            imageUrl: detailData.imageUrl,
            contract: detailData.contract,
          };
          dispatch(setAirdropDetail({ id, detail }));
        } else {
          setError('Airdrop not found');
          dispatch(setAirdropDetailLoading({ id, loading: false }));
        }
      } catch (err) {
        console.error('Failed to fetch airdrop detail:', err);
        setError('Failed to load airdrop details');
        dispatch(setAirdropDetailLoading({ id, loading: false }));
      }
    };

    fetchAirdropDetail();
  }, [id, cachedDetail, detailLastFetched, dispatch, inferredAirdropType]);

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
          {/* Go Back Button */}
          <div className="ml-4 max-w-6xl mx-auto mb-4 mt-3">
            <Button
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-1 cursor-pointer !bg-[#121212] text-white rounded-[5px]"
            >
              <svg className="w-4 h-4 text-[#FFFFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Go Back</span>
            </Button>
          </div>

          {/* Hero Section */}
          <div className="px-5 max-w-6xl mx-auto py-12.5">
            {isDetailLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <DotLottieReact src="/lotties/Loading.lottie" autoplay loop style={{ width: 48, height: 48 }} />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-[#bfbfbf] text-xl">{error}</p>
              </div>
            ) : airdropDetail ? (
              <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 min-[1200px]:items-start">
                {/* Right Side - Video */}
                <div className="flex justify-center min-[1200px]:justify-end min-[1200px]:order-2">
                  <div className="w-[400px] h-[400px]">
                    <video
                      src="/videos/Airdrop.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Left Side - Text Content */}
                <div className="flex flex-col items-center text-center min-[1200px]:order-1 min-[1200px]:items-start min-[1200px]:text-left">
                  {/* Status Tag */}
                  <div
                    className="inline-block px-2.5 py-1 rounded-[5px] mb-2.5 text-base font-semibold text-black"
                    style={{
                      backgroundColor:
                        airdropDetail.status === 'On-Going'
                          ? '#5DF23F'
                          : airdropDetail.status === 'Coming Soon'
                          ? '#F7EA94'
                          : '#BFBFBF',
                    }}
                  >
                    {airdropDetail.status}
                  </div>
                  <h1 className="text-[50px] leading-[1.5] font-[900] text-white">{airdropDetail.name}</h1>
                  <div className="space-y-6 text-white text-base leading-[1.5] mb-5">
                    <p className="text-[#bfbfbf] text-base">
                      {parseMarkdownLinks(airdropDetail.description)}
                    </p>
                    <div className="space-y-1">
                      <p className="text-[#bfbfbf] text-base">
                        Claim period: <span className="text-white text-base">{airdropDetail.claimPeriodStart} ~ {airdropDetail.claimPeriodEnd}</span>
                      </p>
                      <p className="text-[#bfbfbf] text-base">
                        Vesting Period: <span className="text-white text-base">{airdropDetail.vestingPeriodStart} ~ {airdropDetail.vestingPeriodEnd} (
                          {airdropDetail.vestingDuration})</span>
                      </p>
                    </div>
                    <p className="text-[#bfbfbf] text-base">{airdropDetail.eligibilityDescription}</p>
                  </div>
                  {isConnected ? (
                   <></>
                  ) : (
                    <Button
                      variant="white"
                      size="md"
                      onClick={() => open({ view: 'Connect' })}
                      className="cursor-pointer border border-white"
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Token Plans Section - Only shown when wallet is connected */}
          {isConnected && airdropDetail && (
            <div className="px-5 max-w-6xl mx-auto mt-7.5 mb-20">
              {/* Wallet Connection Status */}
              {address && (
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-11 h-11 rounded-full overflow-hidden">
                    {React.createElement('wui-avatar', { ref: avatarRef, address })}
                  </span>
                  <div className="flex flex-col">
                      <span className="text-white text-base font-semibold leading-[1.5] tracking-[0.8px]">
                        Token plans for
                      </span>
                    <span className="text-white text-sm leading-[1.5] tracking-[0.8px]">{shortAddress}</span>
                  </div>
                </div>
                  <Button
                    variant="white"
                    size="lg"
                    onClick={() => disconnect()}
                    className="cursor-pointer border border-black"
                  >
                  Disconnect
                </Button>
              </div>
              )}

              {/* Eligibility Status */}
              {isVestingLoading ? (
                <div className="flex items-center gap-2 mb-5">
                  <DotLottieReact src="/lotties/Loading.lottie" autoplay loop style={{ width: 24, height: 24 }} />
                </div>
              ) : vestingData && vestingData.isActive ? (
                <h2 className="text-[50px] font-[600] text-white leading-[1] mb-5">You are eligible.</h2>
              ) : (
                <h2 className="text-[50px] font-[600] text-white leading-[1] mb-5">Sorry, you are not eligible.</h2>
              )}

              {/* Overview Section */}
              <div className="bg-[#121212] rounded-lg px-5 border border-[#2D2D2D] mb-5">
                <h3 className="text-[#bfbfbf] text-xl font-semibold leading-[1.2] tracking-[0.8] mb-5 py-5">Overview</h3>
                
                {/* Progress Bar */}
                <div>
                  {/* Progress Bar Container */}
                  <div className="relative w-full mt-5 pb-4">
                    {/* Progress Text - Above the bar, positioned over purple section */}
                    {progressData && (
                      <div className="absolute right-0 -top-6 flex items-center justify-end">
                        <span className="text-[#bfbfbf] text-sm font-semibold leading-[1.5] tracking-[0]">
                          {progressData.vestedAmount}/{progressData.totalAmount} ({progressData.claimedAmount} HPP Claimed)
                        </span>
                      </div>
                    )}
                    
                    {/* Progress Bar Background */}
                    <div className="relative w-full h-6 bg-[#2D2D2D] rounded-full overflow-hidden">
                      {/* Not Vested (Green) */}
                      {progressData && (
                        <div className="absolute left-0 top-0 h-full bg-[#5DF23F]" style={{ width: `${progressData.notVestedPercent}%` }}></div>
                      )}
                      {/* Vested (Purple) */}
                      {progressData && (
                        <div className="absolute right-0 top-0 h-full bg-[#4949B4]" style={{ width: `${progressData.vestedPercent}%` }}></div>
                      )}
                    </div>
                    
                    {/* Dashed vertical lines extending above the bar */}
                    <div className="absolute left-[25%] top-0 h-6 w-px" style={{ borderLeft: '1px dashed #2D2D2D' }}></div>
                    <div className="absolute left-[50%] top-0 h-6 w-px" style={{ borderLeft: '1px dashed #2D2D2D' }}></div>
                    <div className="absolute left-[75%] top-0 h-6 w-px" style={{ borderLeft: '1px dashed #2D2D2D' }}></div>
                    
                    {/* Percentage markers */}
                    <div className="relative mt-3 h-4">
                      <span className="absolute left-0 text-[#bfbfbf] text-sm font-semibold leading-[1] tracking-[0]">0%</span>
                      <span className="absolute left-[25%] -translate-x-1/2 text-[#bfbfbf] text-sm font-semibold leading-[1] tracking-[0]">25%</span>
                      <span className="absolute left-[50%] -translate-x-1/2 text-[#bfbfbf] text-sm font-semibold leading-[1] tracking-[0]">50%</span>
                      <span className="absolute left-[75%] -translate-x-1/2 text-[#bfbfbf] text-sm font-semibold leading-[1] tracking-[0]">75%</span>
                      <span className="absolute right-0 text-[#bfbfbf] text-sm font-semibold leading-[1] tracking-[0]">100%</span>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="-mx-5 border-t border-[#2D2D2D]">
                  <div className="grid grid-cols-1 min-[640px]:grid-cols-4">
                    <div className="flex flex-col items-center text-center px-4 py-4 border-b min-[640px]:border-b-0 min-[640px]:border-r border-[#2D2D2D]">
                      <span className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px] mb-2">Total Allocation</span>
                      <span className="text-white text-xl font-semibold leading-[24px]">
                        {isVestingLoading ? '...' : vestingData ? `${formatTokenBalance(vestingData.totalAmount, 0)} HPP` : '- HPP'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center text-center px-4 py-4 border-b min-[640px]:border-b-0 min-[640px]:border-r border-[#2D2D2D]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#5DF23F]"></div>
                        <span className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px]">Not Vested</span>
                      </div>
                      <span className="text-white text-xl font-semibold leading-[24px]">
                        {isVestingLoading ? '...' : vestingData ? `${formatTokenBalance(vestingData.notVestedAmount, 2)} HPP` : '- HPP'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center text-center px-4 py-4 border-b min-[640px]:border-b-0 min-[640px]:border-r border-[#2D2D2D]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#4949B4]"></div>
                        <span className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px]">Vested</span>
                      </div>
                      <span className="text-white text-xl font-semibold leading-[24px]">
                        {isVestingLoading ? '...' : vestingData ? `${formatTokenBalance(vestingData.vestedAmount, 2)} HPP` : '- HPP'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center text-center px-4 py-4 min-[640px]:border-r border-[#2D2D2D]">
                      <span className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px] mb-2">Claimed</span>
                      <span className="text-white text-xl font-semibold leading-[24px]">
                        {isVestingLoading ? '...' : vestingData ? `${formatTokenBalance(vestingData.claimedAmount, 2)} HPP` : '- HPP'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Claim Section */}
              {vestingData && vestingData.isActive && (
                <div className="flex items-center justify-between bg-[#121212] rounded-lg px-5 py-7 mb-5">
                  <span>
                    <span className="text-[#5DF23F] font-bold text-3xl leading-[1.5] tracking-[0.8px]">
                      {isVestingLoading ? '...' : claimableAmount ? formatTokenBalance(claimableAmount, 2) : '0'}
                    </span>
                    <span className="text-white text-xl leading-[1.5] tracking-[0.8px] ml-2">HPP tokens ready to claim.</span>
                  </span>
                  <div className="flex gap-3">
                    {(() => {
                      const isDisabled =
                        isVestingLoading || isClaiming || !claimableAmount || new Big(claimableAmount).lte(0);
                      return (
                        <Button
                          variant={isDisabled ? 'black' : 'white'}
                          size="md"
                          onClick={() => setIsClaimModalOpen(true)}
                          disabled={isDisabled}
                        >
                      Claim
                    </Button>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Claim Options Modal */}
              {isClaimModalOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
                  style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                  onClick={() => setIsClaimModalOpen(false)}
                >
                  <div
                    className="relative w-full max-w-6xl rounded-[5px] bg-black p-4 border border-[#2D2D2D]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      aria-label="Close"
                      className="absolute right-4 top-4 z-10 text-white cursor-pointer hover:opacity-80"
                      onClick={() => setIsClaimModalOpen(false)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {/* Reserve vertical space so the close button doesn't overlap the right card header */}
                    <div className="pt-10 grid grid-cols-1 min-[900px]:grid-cols-2 gap-8">
                      {/* Claim Only */}
                      <div className="flex flex-col rounded-[5px] bg-[#121212] p-8 min-h-[260px]">
                        <div className="flex-1">
                          <div className="text-white text-xl font-semibold leading-[1.2] tracking-[0.8px] mb-5">
                            Claim Only
                          </div>
                          <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px] mb-5">
                            Claim and receive HPP immediately
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px]">Claim Amount</div>
                            <div className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px]">
                              {claimableAmount ? formatTokenBalance(claimableAmount, 2) : '0.00'}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="green"
                          size="md"
                          fullWidth
                          className="mt-5 !rounded-full"
                          disabled={isVestingLoading || isClaiming || !claimableAmount || new Big(claimableAmount).lte(0)}
                          onClick={async () => {
                            setIsClaimModalOpen(false);
                            await onClaimTokens();
                          }}
                        >
                          Claim
                        </Button>
                      </div>

                      {/* Claim + Stake */}
                      <div className="flex flex-col rounded-[5px] bg-[#121212] p-8 min-h-[260px]">
                        <div className="flex-1">
                          <div className="text-white text-xl font-semibold leading-[1.2] tracking-[0.8px] mb-5">
                            Claim + Stake
                          </div>
                          <div className="text-[#F7EA94] text-base leading-[1.2] tracking-[0.8px] mb-5">
                            Staking goes into <span className="underline">HPP Staking</span>.
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px]">
                                Claim + Stake Amount
                              </div>
                              <div className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px]">
                                {claimableAmount ? formatTokenBalance(claimableAmount, 2) : '0.00'}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px]">
                                Staking APR (HPP)
                              </div>
                              <div className="text-[#5DF23F] text-base font-semibold leading-[1.2] tracking-[0.8px]">Max 23% APR</div>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="green"
                          size="md"
                          fullWidth
                          className="mt-5 !rounded-full"
                          disabled={isVestingLoading || isClaiming || !claimableAmount || new Big(claimableAmount).lte(0)}
                          onClick={async () => {
                            setIsClaimModalOpen(false);
                            await onClaimAndStake();
                          }}
                        >
                          Claim + Stake
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Modal (Claim / Claim + Stake) */}
              {successModal && (
                <div
                  className="fixed inset-0 z-[60] flex items-center justify-center px-4 backdrop-blur-sm"
                  style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                  onClick={() => setSuccessModal(null)}
                >
                  <div
                    className="relative w-full max-w-3xl rounded-[5px] bg-black p-8 border border-[#2D2D2D]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      aria-label="Close"
                      className="absolute right-4 top-4 z-10 text-white cursor-pointer hover:opacity-80"
                      onClick={() => setSuccessModal(null)}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {successModal.variant === 'claim' ? (
                      <>
                        <div className="text-white text-[64px] leading-[1] font-[900] mb-6">Congrats!</div>
                        <div className="text-[#5DF23F] text-xl font-semibold leading-[1.2] tracking-[0.8px] mb-6">
                          {successModal.amount} HPP claimed!
                        </div>
                        <div className="text-white text-base leading-[1.5] tracking-[0.8px] mb-10">
                          Your rewards don't stop here. Stake your airdrop and earn up to 23% APR.
                        </div>
                        <Button
                          variant="green"
                          size="md"
                          fullWidth
                          className="!rounded-full"
                          onClick={() => {
                            setSuccessModal(null);
                            router.push('/staking');
                          }}
                        >
                          Go to HPP Staking
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-white text-[64px] leading-[1] font-[900] mb-6">You're in!</div>
                        <div className="text-[#5DF23F] text-xl font-semibold leading-[1.2] tracking-[0.8px] mb-6">
                          {successModal.amount} HPP claimed and staked!
                        </div>
                        <div className="text-white text-base leading-[1.5] tracking-[0.8px] mb-10">
                          Stake early, stake more, and maximize your rewards with up to 23% APR.
                        </div>
                        <Button
                          variant="green"
                          size="md"
                          fullWidth
                          className="!rounded-full"
                          onClick={() => {
                            setSuccessModal(null);
                            router.push('/staking');
                          }}
                        >
                          Go to HPP Staking
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* History Section */}
              <div className="mb-25">
                <div className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px] mb-2.5">History</div>
                <div className="rounded-[5px] bg-[#121212]">
                  {isHistoryLoading &&
                  (!historyItems || historyItems.length === 0 || !historyItems.some((h) => h.isLocal)) ? (
                    <div className="h-[120px] flex items-center justify-center gap-2">
                      <DotLottieReact src="/lotties/Loading.lottie" autoplay loop style={{ width: 24, height: 24 }} />
                      <p className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px]">Fetching history...</p>
                    </div>
                  ) : historyItems && historyItems.length > 0 ? (
                    <>
                      <div className="divide-y divide-[#2D2D2D] pt-3.5">
                        {historyItems
                          .slice(Math.max(0, (historyPage - 1) * 10), Math.max(0, historyPage * 10))
                          .map((tx) => (
                            <div
                              key={tx.id}
                              className="px-5 py-4 last:border-b last:border-[#2D2D2D] hover:bg-[#1a1a1a] transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px]">{tx.date}</div>
                                  <div className="mt-2.5 text-[#5DF23F] text-base leading-[1.2] tracking-[0.8px] font-normal">
                                    {tx.action}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <div className="flex items-center gap-2 text-white text-sm leading-[1.2] tracking-[0.8px]">
                                    <span>
                                      {tx.status === 'Pending' ? (
                                        <span className="pending-text">Pending</span>
                                      ) : (
                                        tx.status || 'Completed'
                                      )}
                                    </span>
                                    <a
                                      href={`${explorerBase}/tx/${tx.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="cursor-pointer hover:opacity-80"
                                      aria-label="View transaction on explorer"
                                    >
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                  </svg>
                                    </a>
                                  </div>
                                   <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                                    {tx.amount || '-'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                      {historyPageCount > 1 && (
                        <div className="flex items-center justify-center pt-4 pb-7.5">
                          <div className="flex items-center gap-4.5">
                            <button
                              aria-label="Previous page"
                              className="cursor-pointer text-white hover:opacity-80 disabled:opacity-30 disabled:cursor-default"
                              onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                              disabled={historyPage <= 1}
                            >
                              ◀
                            </button>
                            <div className="flex items-center gap-4.5">
                              {(() => {
                                const pages: (number | string)[] = [];
                                const maxMobilePages = 5;
                                const showAll = historyPageCount <= maxMobilePages;

                                if (showAll) {
                                  for (let i = 1; i <= historyPageCount; i++) {
                                    pages.push(i);
                                  }
                                } else {
                                  let startPage = Math.max(1, historyPage - 2);
                                  let endPage = Math.min(historyPageCount, startPage + maxMobilePages - 1);

                                  if (endPage - startPage < maxMobilePages - 1) {
                                    startPage = Math.max(1, endPage - maxMobilePages + 1);
                                  }

                                  for (let i = startPage; i <= endPage; i++) {
                                    pages.push(i);
                                  }
                                }

                                return (
                                  <>
                                    <div className="hidden min-[640px]:flex items-center gap-4.5">
                                      {Array.from({ length: historyPageCount }).map((_, i) => {
                                        const n = i + 1;
                                        const active = n === historyPage;
                                        return (
                                          <button
                                            key={n}
                                            aria-current={active ? 'page' : undefined}
                                            className={[
                                              'cursor-pointer flex items-center justify-center rounded-full',
                                              'w-6 h-6 text-base leading-[1] tracking-[0]',
                                              active ? 'bg-white text-black' : 'text-[#BFBFBF] hover:text-white',
                                            ].join(' ')}
                                            onClick={() => setHistoryPage(n)}
                                          >
                                            {n}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <div className="flex min-[640px]:hidden items-center gap-4.5">
                                      {pages.map((page, idx) => {
                                        if (typeof page === 'string') {
                                          return (
                                            <span key={`ellipsis-${idx}`} className="text-[#BFBFBF]">
                                              ...
                                            </span>
                                          );
                                        }
                                        const active = page === historyPage;
                                        return (
                                          <button
                                            key={page}
                                            aria-current={active ? 'page' : undefined}
                                            className={[
                                              'cursor-pointer flex items-center justify-center rounded-full',
                                              'w-6 h-6 text-base leading-[1] tracking-[0]',
                                              active ? 'bg-white text-black' : 'text-[#BFBFBF] hover:text-white',
                                            ].join(' ')}
                                            onClick={() => setHistoryPage(page)}
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
                              onClick={() => setHistoryPage(Math.min(historyPageCount, historyPage + 1))}
                              disabled={historyPage >= historyPageCount}
                            >
                              ▶
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-[120px] flex items-center justify-center">
                      <p className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px]">No history available.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FAQ Section */}
          <div className="px-5 max-w-6xl mx-auto mt-7.5 mb-20">
            <FaqSection items={airdropData.faq} />
          </div>

          {/* Don't Miss the Next Airdrop Section */}
          <DontMissAirdrop />

          <Footer />
        </main>
      </div>
    </div>
  );
}
