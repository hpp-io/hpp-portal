'use client';

import React, { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { navItems, legalLinks } from '@/config/navigation';
import { ARB, Orbiter, EthereumIcon, SepoliaIcon, USDCIcon, USDCEIcon, HPPTickerIcon } from '@/assets/icons';
import { bridgeData } from '@/static/uiData';
import FaqSection from '@/components/ui/Faq';
import { useHppChain, useHppPublicClient } from '@/app/staking/hppClient';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { maxUint256, parseUnits, formatEther, formatUnits, zeroAddress } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { getWalletClient } from '@wagmi/core';
import { config as wagmiConfig } from '@/config/walletConfig';
import { standardArbErc20Abi } from '@/app/staking/abi';
import { useEnsureChain } from '@/hooks/useWallet';
import { useToast } from '@/hooks/useToast';
import { pollL2TxHashFromBridgeL1Tx } from '@/lib/hppArbitrumL2Tx';
import { getHppUsdcDepositTxRequest } from '@/lib/hppUsdcBridgeDeposit';
import { getHppEthDepositTxRequest } from '@/lib/hppEthBridgeDeposit';
import { getHppExplorerBaseUrl } from '@/lib/hppExplorer';
import { tryDecodeCreateRetryableTicket, tryDecodeRetryableTicketFromInboxLogs } from '@/lib/arbitrumRetryableDecode';
import {
  fetchBridgeHistoryFromApi,
  loadBridgeHistoryCacheForWallet,
  mergeBridgeHistoryPrioritizeApi,
  upsertBridgeHistoryCacheForWallet,
  type BridgeHistoryRow,
} from '@/lib/bridgeHistory';
import { formatDisplayAmount, PERCENTS, computePercentAmount } from '@/lib/helpers';
import { hppCore } from '@/config/hppCore';
import Big from 'big.js';

const L1_SEPOLIA_CHAIN_ID = 11155111;
const L1_USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const;
const L2_USDCE_ADDRESS = '0x401eCb1D350407f13ba348573E5630B83638E30D' as const;
const USDC_DECIMALS = 6;
const BRIDGE_TRACKING_POLL_MS = 10000;
const BRIDGE_TRACKING_MAX_ATTEMPTS = 36;
/** SDK L2 resolution: interval between L1/L2 checks until L2 hash found or effect aborts. */
const BRIDGE_L2_SDK_POLL_MS = 10_000;
/** Persists a JSON array of `PendingBridgeTransfer`. Legacy single-object saves are migrated on read. */
const BRIDGE_PENDING_STORAGE_KEY = 'hpp_bridge_pending_transfer_v1';
const BRIDGE_L2_ETA_COPY = 'L2 arrival estimate will update in the status card.';

/** Portal embed `theme` — double-encoded JSON per Arbitrum iframe (5px radius). */
const ARBITRUM_EMBED_THEME_QUERY = `theme=${encodeURIComponent(
  encodeURIComponent(
    JSON.stringify({
      borderRadius: '5px',
    }),
  ),
)}`;

const bridgeL2EtaTooltip = (startedAt: number, nowTs: number, etaMaxMs: number) => {
  const elapsedMs = Math.max(0, nowTs - startedAt);
  const remainingMaxMs = Math.max(0, etaMaxMs - elapsedMs);
  if (remainingMaxMs <= 0) return 'L2 arrival is taking longer than recent estimates.';
  const toMin = (ms: number) => Math.max(1, Math.ceil(ms / 60000));
  return `L2 arrival estimate: ~${toMin(remainingMaxMs)} min.`;
};

const l1GatewayRouterAbi = [
  {
    type: 'function',
    name: 'getGateway',
    stateMutability: 'view',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ type: 'address' }],
  },
] as const;

type NativeBridgeRoute = 'eth_eth' | 'hpp_hpp' | 'usdc_usdce';
type BridgeDirection = 'eth_to_hpp' | 'hpp_to_eth';
type BridgeTrackingStatus = 'pending' | 'success' | 'failed';
type PendingTransferStatus = BridgeTrackingStatus;

type BridgeTrackingCreateResponse = {
  trackingId?: string;
  l2TxHash?: `0x${string}`;
  status?: BridgeTrackingStatus;
};

type BridgeTrackingStatusResponse = {
  l2TxHash?: `0x${string}`;
  status?: BridgeTrackingStatus;
};

type PendingBridgeTransfer = {
  l1TxHash: `0x${string}`;
  l2TxHash?: `0x${string}`;
  trackingId?: string;
  status: PendingTransferStatus;
  amount: string;
  fromToken: string;
  toToken: string;
  sourceNetwork: string;
  destinationNetwork: string;
  walletAddress: `0x${string}`;
  startedAt: number;
  updatedAt: number;
  /** L1 bridge `outboundTransfer` execution gas (gasUsed × effectiveGasPrice), wei as string. */
  l1GasFeeWei?: string;
  /** L1 USDC `approve` gas (wei string); `null` = this run skipped approve; omitted on old saved state. */
  l1ApproveGasFeeWei?: string | null;
  /** ETH sent with the L1 bridge tx (`value`), wei as string. */
  l1TxValueWei?: string;
  /** `maxSubmissionCost` from Inbox `createRetryableTicket` input (Etherscan-style protocol/posting fee). */
  l1MaxSubmissionCostWei?: string;
  /** Whether that value came from SDK estimate (legacy saves may omit). */
  l1BridgeDepositSource?: 'estimated';
  l1BlockNumber?: string;
  /** L2 execution gas fee once receipt is fetched, wei as string. */
  l2GasFeeWei?: string;
};

const pendingSuccessToHistoryRow = (t: PendingBridgeTransfer): BridgeHistoryRow | null => {
  if (t.status !== 'success') return null;
  return {
    l1TxHash: t.l1TxHash,
    l2TxHash: t.l2TxHash,
    trackingId: t.trackingId,
    amount: t.amount,
    fromToken: t.fromToken,
    toToken: t.toToken,
    sourceNetwork: t.sourceNetwork,
    destinationNetwork: t.destinationNetwork,
    walletAddress: t.walletAddress,
    startedAt: t.startedAt,
    updatedAt: t.updatedAt,
    status: 'success',
    l1GasFeeWei: t.l1GasFeeWei,
    l1ApproveGasFeeWei: t.l1ApproveGasFeeWei,
    l1TxValueWei: t.l1TxValueWei,
    l1MaxSubmissionCostWei: t.l1MaxSubmissionCostWei,
    l2GasFeeWei: t.l2GasFeeWei,
  };
};

const historyRowToPendingTransfer = (row: BridgeHistoryRow): PendingBridgeTransfer => ({
  l1TxHash: row.l1TxHash,
  l2TxHash: row.l2TxHash,
  trackingId: row.trackingId,
  status: 'success',
  amount: row.amount,
  fromToken: row.fromToken,
  toToken: row.toToken,
  sourceNetwork: row.sourceNetwork,
  destinationNetwork: row.destinationNetwork,
  walletAddress: row.walletAddress,
  startedAt: row.startedAt,
  updatedAt: row.updatedAt,
  l1GasFeeWei: row.l1GasFeeWei,
  l1ApproveGasFeeWei: row.l1ApproveGasFeeWei,
  l1TxValueWei: row.l1TxValueWei,
  l1MaxSubmissionCostWei: row.l1MaxSubmissionCostWei,
  l2GasFeeWei: row.l2GasFeeWei,
});

const txFeeWeiFromReceipt = (receipt: {
  gasUsed: bigint;
  effectiveGasPrice?: bigint | null;
  gasPrice?: bigint | null;
}) => {
  const price = receipt.effectiveGasPrice ?? receipt.gasPrice ?? BigInt(0);
  return receipt.gasUsed * price;
};

/** When receipt omits gas price, use tx-level pricing (legacy / some RPC shapes). */
const txFeeWeiFromReceiptAndTx = (
  receipt: { gasUsed: bigint; effectiveGasPrice?: bigint | null; gasPrice?: bigint | null },
  tx: { gasPrice?: bigint | null; maxFeePerGas?: bigint | null } | null,
) => {
  let fee = txFeeWeiFromReceipt(receipt);
  if (fee > BigInt(0)) return fee;
  const txPrice = tx?.gasPrice ?? tx?.maxFeePerGas ?? BigInt(0);
  if (txPrice > BigInt(0)) return receipt.gasUsed * txPrice;
  return fee;
};

const formatWeiAsEthCompact = (weiStr: string | undefined) => {
  if (weiStr == null || weiStr === '') return '—';
  try {
    const wei = BigInt(weiStr);
    if (wei === BigInt(0)) return '0 ETH';
    const s = formatEther(wei);
    const n = Number(s);
    if (!Number.isFinite(n)) return `${s} ETH`;
    if (Math.abs(n) < 1e-12) return `${s} ETH`;
    return `${n.toLocaleString(undefined, { maximumFractionDigits: 8 })} ETH`;
  } catch {
    return '—';
  }
};

const parseWeiStrToBigInt = (v: string | null | undefined): bigint => {
  if (v == null || v === '') return BigInt(0);
  try {
    return BigInt(v);
  } catch {
    return BigInt(0);
  }
};

/** L1 execution gas: bridge tx + approve tx only when this session submitted approve (non-empty string). */
const sumL1GasWei = (pt: PendingBridgeTransfer): bigint => {
  let sum = parseWeiStrToBigInt(pt.l1GasFeeWei);
  if (typeof pt.l1ApproveGasFeeWei === 'string' && pt.l1ApproveGasFeeWei !== '') {
    sum += parseWeiStrToBigInt(pt.l1ApproveGasFeeWei);
  }
  return sum;
};

const hasL1ApproveGasThisSession = (pt: PendingBridgeTransfer) =>
  typeof pt.l1ApproveGasFeeWei === 'string' && pt.l1ApproveGasFeeWei !== '';

/** Breakdown tooltip only when approve ran this session (bridge + approve lines). */
const l1GasBreakdownTooltipText = (pt: PendingBridgeTransfer) => {
  const lines = [
    `Bridge (outbound)`,
    formatWeiAsEthCompact(pt.l1GasFeeWei),
    '',
    `Approve (${pt.fromToken})`,
    formatWeiAsEthCompact(pt.l1ApproveGasFeeWei ?? undefined),
  ];
  return lines.join('\n');
};

const protocolFeeTooltipText = (pt: PendingBridgeTransfer) => {
  const dest = pt.destinationNetwork;
  const lines = [
    `Retryable ticket to ${dest}: max submission cost pays L1 posting (protocol fee on explorers).`,
    'Total msg.value also includes L2 execution prepayment (gas limit × max fee) and any L2-call ETH.',
  ];
  if (pt.l1MaxSubmissionCostWei && pt.l1TxValueWei) {
    lines.push(
      '',
      `Max submission: ${formatWeiAsEthCompact(pt.l1MaxSubmissionCostWei)}`,
      `Total L1 ETH: ${formatWeiAsEthCompact(pt.l1TxValueWei)}`,
    );
  }
  return lines.join('\n');
};

const formatBridgeLocalDateTime = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Long date; locale follows the browser/OS default (`undefined` = runtime default). */
const formatBridgeCardDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { month: 'long', day: '2-digit', year: 'numeric' });

/** Time only; locale follows the browser/OS default (`undefined` = runtime default). */
const formatBridgeCardTime = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Outgoing amount line: one token label (avoid redundant "HPP → HPP"). */
const bridgeTransferPrimaryToken = (t: PendingBridgeTransfer) => {
  const a = t.fromToken.trim();
  const b = t.toToken.trim();
  if (a.toLowerCase() === b.toLowerCase()) return a;
  return a;
};

const bridgeTransferDisplayTimestampMs = (t: PendingBridgeTransfer) =>
  t.status === 'pending' ? t.startedAt : t.updatedAt;

const routeConfig: Record<
  NativeBridgeRoute,
  {
    label: string;
    fromLabel: string;
    fromNetwork: string;
    fromToken: string;
    toNetwork: string;
    toToken: string;
    estimatedTime: string;
  }
> = {
  eth_eth: {
    label: 'ETH (ETH) -> ETH (HPP)',
    fromLabel: 'ETH',
    fromNetwork: 'Ethereum',
    fromToken: 'ETH',
    toNetwork: 'HPP Mainnet',
    toToken: 'ETH',
    estimatedTime: '~ 5-15 min',
  },
  hpp_hpp: {
    label: 'HPP (ETH) -> HPP (HPP)',
    fromLabel: 'HPP',
    fromNetwork: 'Ethereum',
    fromToken: 'HPP',
    toNetwork: 'HPP Mainnet',
    toToken: 'HPP',
    estimatedTime: '~ 5-15 min',
  },
  usdc_usdce: {
    label: 'USDC (ETH) -> USDC.e (HPP)',
    fromLabel: 'USDC',
    fromNetwork: 'Ethereum',
    fromToken: 'USDC',
    toNetwork: 'HPP Mainnet',
    toToken: 'USDC.e',
    estimatedTime: '~ 5-15 min',
  },
};

function BridgeTransferHeaderSummary({
  transfer,
  renderIconBadge,
}: {
  transfer: PendingBridgeTransfer;
  renderIconBadge: (label: string) => React.ReactNode;
}) {
  const amt = formatDisplayAmount(transfer.amount.trim()) || transfer.amount;
  const primaryToken = bridgeTransferPrimaryToken(transfer);
  const ts = bridgeTransferDisplayTimestampMs(transfer);

  return (
    <div className="min-w-0 flex-1 space-y-3">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-[#8f8f8f]">
        <span className="min-w-0">{formatBridgeCardDate(ts)}</span>
        <span className="shrink-0 tabular-nums">{formatBridgeCardTime(ts)}</span>
      </div>
      <div className="flex min-w-0 items-center gap-1">
        <span className="flex shrink-0 items-center justify-center">{renderIconBadge(primaryToken)}</span>
        <span className="flex min-w-0 items-baseline gap-1.5 truncate text-lg font-semibold leading-none tracking-tight text-white">
          <span className="tabular-nums">{amt}</span>
          <span className="min-w-0 truncate">{primaryToken}</span>
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[#cfcfcf]">
        <span className="inline-flex min-w-0 items-center gap-1">
          {renderIconBadge(transfer.sourceNetwork)}
          <span className="truncate">{transfer.sourceNetwork}</span>
        </span>
        <span className="shrink-0 text-[#6b6b6b]" aria-hidden>
          →
        </span>
        <span className="inline-flex min-w-0 items-center gap-1">
          {renderIconBadge(transfer.destinationNetwork)}
          <span className="truncate">{transfer.destinationNetwork}</span>
        </span>
      </div>
    </div>
  );
}

export default function BridgeClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showNativeBridge = false;
  const [amount, setAmount] = useState('');
  const [isSubmittingBridge, setIsSubmittingBridge] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<NativeBridgeRoute>('usdc_usdce');
  const [bridgeDirection, setBridgeDirection] = useState<BridgeDirection>('eth_to_hpp');
  const [isFromDropdownOpen, setIsFromDropdownOpen] = useState(false);
  const [isDirectionDropdownOpen, setIsDirectionDropdownOpen] = useState(false);
  const [fromBalance, setFromBalance] = useState('--');
  const [toBalance, setToBalance] = useState('--');
  const [maxAmount, setMaxAmount] = useState('0');
  const [inputError, setInputError] = useState('');
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  /** Tab / window back to foreground — same idea as TanStack Query `refetchOnWindowFocus`. */
  const [balanceVisibilityRefetchNonce, setBalanceVisibilityRefetchNonce] = useState(0);
  const [isAllowanceLoading, setIsAllowanceLoading] = useState(false);
  const [usdcAllowanceWei, setUsdcAllowanceWei] = useState<bigint | null>(null);
  const [approveMax, setApproveMax] = useState(true);
  const [pendingBridgeTransfers, setPendingBridgeTransfers] = useState<PendingBridgeTransfer[]>([]);
  /** Prevents the persist effect from wiping localStorage before wagmi restores `address` / before LS hydrate runs. */
  const [bridgeListHydratedFromStorage, setBridgeListHydratedFromStorage] = useState(false);
  const trackingPollActiveRef = useRef<Set<string>>(new Set());
  /** Bumps to restart @arbitrum/sdk L2 poll (tab focus or manual retry). */
  const [l2SdkPollGeneration, setL2SdkPollGeneration] = useState(0);
  /** Retries on-chain enrichments (protocol fee / gas fields) while unresolved rows exist. */
  const [bridgeOnChainSyncGeneration, setBridgeOnChainSyncGeneration] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const fromDropdownRef = useRef<HTMLDivElement | null>(null);
  const directionDropdownRef = useRef<HTMLDivElement | null>(null);
  const trackedL1TxRef = useRef<Set<string>>(new Set());
  const [bridgeHistoryDrawerOpen, setBridgeHistoryDrawerOpen] = useState(false);
  const [bridgeHistoryDrawerEntered, setBridgeHistoryDrawerEntered] = useState(false);
  const bridgeHistoryDrawerCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bridgeHistoryRows, setBridgeHistoryRows] = useState<BridgeHistoryRow[]>([]);
  const [bridgeHistoryLoading, setBridgeHistoryLoading] = useState(false);
  const [bridgeHistoryError, setBridgeHistoryError] = useState<string | null>(null);

  const { id: hppChainId, rpcUrl: hppRpcUrl } = useHppChain();
  const hppPublicClient = useHppPublicClient();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: L1_SEPOLIA_CHAIN_ID });
  const ensureChain = useEnsureChain();
  const { showToast } = useToast();
  const selectedChainEnv = (process.env.NEXT_PUBLIC_CHAIN || 'mainnet').toLowerCase();
  const isSepoliaEnv = selectedChainEnv === 'sepolia';
  const bridgeTrackingApiBase = process.env.NEXT_PUBLIC_BRIDGE_TRACKING_API_BASE;
  const L1_HPP_ADDRESS = process.env.NEXT_PUBLIC_ETH_HPP_TOKEN_CONTRACT as `0x${string}` | undefined;
  const L2_HPP_ADDRESS = process.env.NEXT_PUBLIC_HPP_TOKEN_CONTRACT as `0x${string}` | undefined;
  // Same L1 HPP token as NEXT_PUBLIC_ETH_HPP_TOKEN_CONTRACT (.env): Arbitrum `token=` is the bridged Ethereum address.
  const arbitrumBridgeHref = (() => {
    const base = isSepoliaEnv
      ? 'https://portal.arbitrum.io/bridge/embed?destinationChain=hpp-sepolia&sanitized=true&sourceChain=sepolia&tab=bridge'
      : 'https://portal.arbitrum.io/bridge/embed?destinationChain=hpp-mainnet&sanitized=true&sourceChain=ethereum&tab=bridge';
    const tokenQs = L1_HPP_ADDRESS?.trim()
      ? `&token=${encodeURIComponent(L1_HPP_ADDRESS.trim().toLowerCase())}`
      : '';
    return `${base}${tokenQs}&${ARBITRUM_EMBED_THEME_QUERY}`;
  })();
  /**
   * Deep link sets both contracts: `from` = Ethereum L1 HPP, `to` = HPP L2 HPP (env). UI may shorten the visible URL later.
   */
  const orbiterBridgeHref =
    process.env.NEXT_PUBLIC_ORBITER_BRIDGE_URL?.trim() ||
    (() => {
      if (!L1_HPP_ADDRESS || !L2_HPP_ADDRESS) {
        return 'https://www.orbiter.finance/';
      }
      const from = encodeURIComponent(L1_HPP_ADDRESS.trim().toLowerCase());
      const to = encodeURIComponent(L2_HPP_ADDRESS.trim().toLowerCase());
      return `https://www.orbiter.finance/trade/Ethereum/HPP?from=${from}&to=${to}`;
    })();
  const activeRoute = routeConfig[selectedRoute];
  const l1NetworkLabel = isSepoliaEnv ? 'Sepolia' : 'Ethereum';
  const hppNetworkLabel = isSepoliaEnv ? 'HPP Sepolia' : 'HPP Mainnet';
  const hppBridgeTokensConfigured = Boolean(L1_HPP_ADDRESS && L2_HPP_ADDRESS);
  const l1ExplorerBaseUrl = isSepoliaEnv ? 'https://sepolia.etherscan.io' : 'https://etherscan.io';
  const hppScannerBaseUrl = getHppExplorerBaseUrl();
  const l1RpcUrlDefault = useMemo(
    () => (isSepoliaEnv ? [...sepolia.rpcUrls.default.http][0] : [...mainnet.rpcUrls.default.http][0]),
    [isSepoliaEnv],
  );
  const l1RpcUrlForSdk = useMemo(() => {
    const override = process.env.NEXT_PUBLIC_BRIDGE_L1_RPC_URL?.trim();
    return override || l1RpcUrlDefault;
  }, [l1RpcUrlDefault]);
  const selectedHppCore = isSepoliaEnv ? hppCore.sepolia : hppCore.mainnet;
  const l1GatewayRouterAddress = selectedHppCore?.tokenBridgeContracts.l2Contracts.router;
  const hppL1Rollup = selectedHppCore?.coreContracts.rollup as `0x${string}` | undefined;
  const l2EtaMaxMs = (selectedHppCore?.ui?.l2ArrivalEtaMaxMinutes ?? 20) * 60 * 1000;
  const isReverse = bridgeDirection === 'hpp_to_eth';
  const fromNetworkLabel = isReverse ? hppNetworkLabel : l1NetworkLabel;
  const toNetworkLabel = isReverse ? l1NetworkLabel : hppNetworkLabel;
  const fromTokenLabel = selectedRoute === 'usdc_usdce' && isReverse ? 'USDC.e' : activeRoute.fromToken;
  const toTokenLabel = selectedRoute === 'usdc_usdce' && isReverse ? 'USDC' : activeRoute.toToken;
  const isComingSoonRoute = isReverse || (selectedRoute === 'hpp_hpp' && !hppBridgeTokensConfigured);

  const routeOptionLabel = (route: NativeBridgeRoute) => {
    if (route === 'usdc_usdce') return isReverse ? 'USDC.e' : 'USDC';
    if (route === 'eth_eth') return 'ETH';
    return 'HPP';
  };
  const iconText = (label: string) => (label.toLowerCase().includes('sepolia') ? 'S' : label.slice(0, 1).toUpperCase());
  const renderKnownIcon = (label: string) => {
    const key = (label || '').toLowerCase();
    // `block shrink-0` avoids inline-SVG baseline offset next to text.
    const ic = 'block h-4 w-4 shrink-0';
    // Network icons
    if (key.includes('hpp')) return <HPPTickerIcon className={ic} />;
    if (key === 'ethereum') return <EthereumIcon className={ic} />;
    if (key === 'sepolia') return <SepoliaIcon className={ic} />;
    // Token icons
    if (key === 'hpp') return <HPPTickerIcon className={ic} />;
    if (key === 'eth') return <EthereumIcon className={ic} />;
    if (key === 'usdc') return <USDCIcon className={ic} />;
    if (key === 'usdc.e') return <USDCEIcon className={ic} />;
    return null;
  };
  const isCircularIconLabel = (label: string) => {
    const key = (label || '').toLowerCase();
    return key.includes('hpp') || key === 'hpp' || key === 'eth' || key === 'usdc' || key === 'usdc.e';
  };
  const renderIconBadge = (label: string) => {
    const icon = renderKnownIcon(label);
    const base =
      'flex h-5 w-5 shrink-0 items-center justify-center leading-none text-[10px] font-semibold text-[#cfcfcf]';
    const wrapper =
      icon && isCircularIconLabel(label) ? base : `${base} rounded-full border border-[#3a3a3a] bg-[#1b1b1b]`;
    return <span className={wrapper}>{icon ?? iconText(label)}</span>;
  };

  const bridgeInputDecimals = selectedRoute === 'usdc_usdce' ? USDC_DECIMALS : 18;

  const handleBridgeAmountChange = useCallback(
    (raw: string) => {
      const value = raw.replace(/,/g, '');
      if (!(/^\d*(\.)?\d*$/.test(value) || value === '')) return;

      let next = value;
      if (value.includes('.')) {
        const [intPart, fracPart = ''] = value.split('.');
        if (fracPart.length > bridgeInputDecimals) {
          next = `${intPart}.${fracPart.slice(0, bridgeInputDecimals)}`;
        }
      }
      setAmount(next);

      if (isBalanceLoading) {
        setInputError('');
        return;
      }

      try {
        const balStr = maxAmount.replace(/,/g, '') || '0';
        const v = new Big(next === '' || next === '.' ? '0' : next);
        const b = new Big(balStr);
        if (v.gt(b)) {
          setInputError(`Insufficient ${fromTokenLabel} balance`);
        } else {
          setInputError('');
        }
      } catch {
        setInputError('');
      }
    },
    [bridgeInputDecimals, fromTokenLabel, isBalanceLoading, maxAmount],
  );

  const setBridgePercent = useCallback(
    (p: number) => {
      handleBridgeAmountChange(computePercentAmount(maxAmount, p, bridgeInputDecimals));
    },
    [bridgeInputDecimals, handleBridgeAmountChange, maxAmount],
  );

  const parsedAmount = parseFloat((amount || '').replace(/,/g, '').trim());
  const hasValidPositiveAmount =
    amount.trim() !== '' && amount !== '.' && !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const shouldCheckAllowance =
    isConnected && !isComingSoonRoute && (selectedRoute === 'usdc_usdce' || selectedRoute === 'hpp_hpp');
  const l1Erc20BridgeTokenAddress: `0x${string}` | undefined =
    selectedRoute === 'usdc_usdce'
      ? L1_USDC_ADDRESS
      : selectedRoute === 'hpp_hpp' && L1_HPP_ADDRESS
        ? L1_HPP_ADDRESS
        : undefined;
  // Treat "very large" approvals as effectively unlimited for UX purposes.
  const EFFECTIVE_UNLIMITED_TOKEN_ALLOWANCE = BigInt(1_000_000_000_000) * BigInt(10) ** BigInt(bridgeInputDecimals);
  const isUnlimitedUsdcAllowance =
    usdcAllowanceWei != null &&
    (usdcAllowanceWei >= maxUint256 - BigInt(1) || usdcAllowanceWei >= EFFECTIVE_UNLIMITED_TOKEN_ALLOWANCE);
  const showUnlimitedApprovalOption = shouldCheckAllowance && usdcAllowanceWei != null && !isUnlimitedUsdcAllowance;

  const isBridgeActionDisabled =
    !isConnected ||
    isSubmittingBridge ||
    isComingSoonRoute ||
    !!inputError ||
    isBalanceLoading ||
    !hasValidPositiveAmount;
  const bridgeTooltipLabel = isComingSoonRoute
    ? `Bridge to ${toTokenLabel} (Coming soon)`
    : inputError
      ? inputError
      : isBalanceLoading
        ? 'Loading balance…'
        : !hasValidPositiveAmount
          ? 'Enter an amount'
          : `Bridge to ${toTokenLabel}`;

  const formatBalanceView = (raw: bigint, decimals: number) => {
    const full = formatUnits(raw, decimals);
    const n = Number(full);
    if (!Number.isFinite(n)) return full;
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const formatBalanceInput = (raw: bigint, decimals: number) => {
    const full = formatUnits(raw, decimals);
    const n = Number(full);
    if (!Number.isFinite(n)) return full;
    return n.toFixed(6).replace(/\.?0+$/, '');
  };

  const shortHash = (hash: string) => `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  const readErc20GatewayApprovalContext = useCallback(
    async (l1TokenAddress: `0x${string}`) => {
      if (!publicClient || !address || !l1GatewayRouterAddress) return null;
      const gatewayFromRouter = (await publicClient.readContract({
        address: l1GatewayRouterAddress,
        abi: l1GatewayRouterAbi,
        functionName: 'getGateway',
        args: [l1TokenAddress],
      })) as `0x${string}`;
      const spender = gatewayFromRouter && gatewayFromRouter !== zeroAddress ? gatewayFromRouter : null;
      if (!spender) return null;
      const allowance = (await publicClient.readContract({
        address: l1TokenAddress,
        abi: standardArbErc20Abi,
        functionName: 'allowance',
        args: [address, spender],
      })) as bigint;
      return { spender, allowance };
    },
    [address, publicClient, l1GatewayRouterAddress],
  );

  const formatPendingDuration = (sinceMs: number) => {
    const diffSeconds = Math.max(0, Math.floor((nowTs - sinceMs) / 1000));
    const m = Math.floor(diffSeconds / 60);
    const s = diffSeconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  /** Wall-clock span between two timestamps (no live ticking). */
  const formatElapsedBetweenMs = (fromMs: number, toMs: number) => {
    const diffSeconds = Math.max(0, Math.floor((toMs - fromMs) / 1000));
    const d = Math.floor(diffSeconds / 86400);
    const h = Math.floor((diffSeconds % 86400) / 3600);
    const m = Math.floor((diffSeconds % 3600) / 60);
    const s = diffSeconds % 60;
    if (d > 0) return h > 0 ? `${d}d ${h}h ${m}m` : `${d}d ${m}m`;
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const applyL2Resolved = useCallback((l1TxHash: `0x${string}`, l2TxHash: `0x${string}`) => {
    setPendingBridgeTransfers((prev) =>
      prev.map((t) =>
        t.l1TxHash === l1TxHash ? { ...t, status: 'success' as const, l2TxHash, updatedAt: Date.now() } : t,
      ),
    );
  }, []);

  const pollBridgeTrackingStatus = async (trackingId: string, l1TxHash: `0x${string}`) => {
    if (!bridgeTrackingApiBase) return;
    for (let i = 0; i < BRIDGE_TRACKING_MAX_ATTEMPTS; i += 1) {
      try {
        const statusRes = await fetch(
          `${bridgeTrackingApiBase.replace(/\/$/, '')}/bridge-tracking/${trackingId}?l1TxHash=${l1TxHash}`,
          { method: 'GET' },
        );
        if (statusRes.ok) {
          const statusData = (await statusRes.json()) as BridgeTrackingStatusResponse;
          setPendingBridgeTransfers((prev) =>
            prev.map((t) => (t.l1TxHash === l1TxHash ? { ...t, updatedAt: Date.now() } : t)),
          );
          if (statusData.l2TxHash && statusData.status === 'success') {
            applyL2Resolved(l1TxHash, statusData.l2TxHash);
            return;
          }
          if (statusData.status === 'failed') {
            setPendingBridgeTransfers((prev) =>
              prev.map((t) =>
                t.l1TxHash === l1TxHash ? { ...t, status: 'failed' as const, updatedAt: Date.now() } : t,
              ),
            );
            showToast('L2 bridge failed', 'L2 execution failed. Please check tracking status.', 'error');
            return;
          }
        }
      } catch {
        // Keep polling while backend is temporarily unavailable.
      }
      await wait(BRIDGE_TRACKING_POLL_MS);
    }
    setPendingBridgeTransfers((prev) =>
      prev.map((t) => (t.l1TxHash === l1TxHash ? { ...t, updatedAt: Date.now() } : t)),
    );
  };

  const startBridgeTracking = async (params: {
    l1TxHash: `0x${string}`;
    walletAddress: `0x${string}`;
    amount: string;
    fromToken: string;
    toToken: string;
    sourceNetwork: string;
    destinationNetwork: string;
  }) => {
    const { l1TxHash } = params;
    if (!bridgeTrackingApiBase || trackedL1TxRef.current.has(l1TxHash)) return;
    trackedL1TxRef.current.add(l1TxHash);

    try {
      const createRes = await fetch(`${bridgeTrackingApiBase.replace(/\/$/, '')}/bridge-tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!createRes.ok) return;

      const createData = (await createRes.json()) as BridgeTrackingCreateResponse;
      if (createData.trackingId) {
        setPendingBridgeTransfers((prev) =>
          prev.map((t) =>
            t.l1TxHash === l1TxHash ? { ...t, trackingId: createData.trackingId, updatedAt: Date.now() } : t,
          ),
        );
      }
      if (createData.l2TxHash && createData.status === 'success') {
        applyL2Resolved(l1TxHash, createData.l2TxHash);
        return;
      }
      if (!createData.trackingId) return;

      void pollBridgeTrackingStatus(createData.trackingId, l1TxHash);
    } catch {
      // Silent fail to avoid blocking the bridge UX.
    }
  };

  const onBridgeUsdc = async () => {
    try {
      if (!address || !isConnected) {
        showToast('Wallet required', 'Please connect your wallet first.', 'error');
        return;
      }
      if (!publicClient) {
        showToast('Network error', 'Sepolia public client is not available.', 'error');
        return;
      }

      const normalized = amount.replace(/,/g, '').trim();
      if (inputError) {
        showToast('Invalid amount', inputError, 'error');
        return;
      }
      if (!normalized || normalized === '.' || Number(normalized) <= 0) {
        showToast('Invalid amount', 'Enter a valid USDC amount.', 'error');
        return;
      }

      try {
        await ensureChain(L1_SEPOLIA_CHAIN_ID, {
          chainName: 'Sepolia',
          rpcUrls: [...sepolia.rpcUrls.default.http],
          nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
        });
      } catch {
        showToast('Switch network', 'Please switch to Sepolia and try again.', 'error');
        return;
      }

      const amountWei = parseUnits(normalized as `${number}`, USDC_DECIMALS);

      const l1WalletClient =
        walletClient ?? (await getWalletClient(wagmiConfig, { account: address, chainId: L1_SEPOLIA_CHAIN_ID }));
      if (!l1WalletClient) {
        showToast('Wallet error', 'Could not initialize wallet client.', 'error');
        return;
      }

      setIsSubmittingBridge(true);
      showToast('Checking allowance...', 'Validating USDC approval for the L1 gateway.', 'loading');
      const approvalContext = await readErc20GatewayApprovalContext(L1_USDC_ADDRESS);
      if (!approvalContext) {
        showToast('Allowance check failed', 'Could not read USDC allowance or L1 gateway for USDC.', 'error');
        return;
      }
      const { spender: usdcApproveSpender, allowance } = approvalContext;

      let l1ApproveGasFeeWei: string | undefined;
      if (allowance < amountWei) {
        const approveAmount = approveMax ? maxUint256 : amountWei;
        showToast(
          'Approval required',
          approveMax
            ? 'Approve max USDC for the bridge gateway. Usually needed once per wallet.'
            : 'Approve only this bridge amount for the gateway.',
          'loading',
        );
        const approveHash = await l1WalletClient.writeContract({
          address: L1_USDC_ADDRESS,
          abi: standardArbErc20Abi,
          functionName: 'approve',
          args: [usdcApproveSpender, approveAmount],
          account: address,
          chain: sepolia,
        });
        const approveReceipt = await publicClient.waitForTransactionReceipt({
          hash: approveHash as `0x${string}`,
        });
        if (approveReceipt.status === 'success') {
          const approveTx = await publicClient.getTransaction({ hash: approveHash as `0x${string}` });
          l1ApproveGasFeeWei = txFeeWeiFromReceiptAndTx(approveReceipt, approveTx).toString();
          setUsdcAllowanceWei(approveAmount);
        }
      }

      showToast('Bridging...', 'Confirm outboundTransfer transaction.', 'loading');

      if (!hppL1Rollup || !hppRpcUrl?.trim()) {
        showToast(
          'Bridge configuration missing',
          !hppL1Rollup
            ? 'HPP rollup is not configured for this environment. Add it in src/config/hppCore.ts for this chain.'
            : 'Set HPP RPC (e.g. NEXT_PUBLIC_HPP_RPC_URL) so the bridge can estimate the L1 deposit.',
          'error',
        );
        return;
      }

      let depositTo: `0x${string}`;
      let depositData: `0x${string}`;
      let depositValue: bigint;

      try {
        const estimated = await getHppUsdcDepositTxRequest({
          l1RpcUrl: l1RpcUrlForSdk,
          l2RpcUrl: hppRpcUrl.trim(),
          l2ChainId: hppChainId,
          rollupAddress: hppL1Rollup,
          networkName: hppNetworkLabel,
          isTestnet: isSepoliaEnv,
          from: address,
          l1TokenAddress: L1_USDC_ADDRESS,
          amount: amountWei,
        });
        depositTo = estimated.to;
        depositData = estimated.data;
        depositValue = estimated.value;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (process.env.NODE_ENV === 'development') {
          console.error('[hpp-portal] getHppUsdcDepositTxRequest failed', e);
        }
        showToast(
          'Bridge deposit estimate failed',
          `${message.slice(0, 220)}${message.length > 220 ? '…' : ''} Check HPP core config, NEXT_PUBLIC_HPP_RPC_URL, and L1 RPC.`,
          'error',
        );
        return;
      }

      const bridgeHash = await l1WalletClient.sendTransaction({
        to: depositTo,
        data: depositData,
        value: depositValue,
        account: address,
        chain: sepolia,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: bridgeHash as `0x${string}` });
      if (receipt.status === 'success') {
        const now = Date.now();
        const l1Tx = await publicClient.getTransaction({ hash: bridgeHash as `0x${string}` });
        const l1GasFeeWei = txFeeWeiFromReceiptAndTx(receipt, l1Tx);
        const nextEntry: PendingBridgeTransfer = {
          l1TxHash: bridgeHash as `0x${string}`,
          status: 'pending',
          amount: normalized,
          fromToken: fromTokenLabel,
          toToken: toTokenLabel,
          sourceNetwork: l1NetworkLabel,
          destinationNetwork: hppNetworkLabel,
          walletAddress: address,
          startedAt: now,
          updatedAt: now,
          l1GasFeeWei: l1GasFeeWei.toString(),
          l1ApproveGasFeeWei: l1ApproveGasFeeWei ?? null,
          l1TxValueWei: (l1Tx?.value ?? depositValue).toString(),
          l1BridgeDepositSource: 'estimated',
          l1BlockNumber: receipt.blockNumber.toString(),
        };
        setPendingBridgeTransfers((prev) => {
          const h = nextEntry.l1TxHash.toLowerCase();
          if (prev.some((t) => t.l1TxHash.toLowerCase() === h)) return prev;
          return [nextEntry, ...prev];
        });
        showToast('Bridge submitted', `USDC bridge request submitted.\n${BRIDGE_L2_ETA_COPY}`, 'success', {
          text: 'View on Etherscan',
          url: `${l1ExplorerBaseUrl}/tx/${bridgeHash}`,
        });
        void startBridgeTracking({
          l1TxHash: bridgeHash as `0x${string}`,
          walletAddress: address,
          amount: normalized,
          fromToken: fromTokenLabel,
          toToken: toTokenLabel,
          sourceNetwork: l1NetworkLabel,
          destinationNetwork: hppNetworkLabel,
        });
        setAmount('');
        setInputError('');
      } else {
        showToast('Bridge failed', 'Transaction failed or was reverted.', 'error');
      }
    } catch (e: any) {
      if (e?.code === 4001) {
        showToast('Transaction rejected', 'You rejected the transaction.', 'error');
      } else {
        showToast('Bridge error', 'Failed to process bridge transaction.', 'error');
      }
    } finally {
      setIsSubmittingBridge(false);
    }
  };

  const onBridgeEth = async () => {
    try {
      if (!address || !isConnected) {
        showToast('Wallet required', 'Please connect your wallet first.', 'error');
        return;
      }
      if (!publicClient) {
        showToast('Network error', 'Sepolia public client is not available.', 'error');
        return;
      }

      const normalized = amount.replace(/,/g, '').trim();
      if (inputError) {
        showToast('Invalid amount', inputError, 'error');
        return;
      }
      if (!normalized || normalized === '.' || Number(normalized) <= 0) {
        showToast('Invalid amount', 'Enter a valid ETH amount.', 'error');
        return;
      }

      try {
        await ensureChain(L1_SEPOLIA_CHAIN_ID, {
          chainName: 'Sepolia',
          rpcUrls: [...sepolia.rpcUrls.default.http],
          nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
        });
      } catch {
        showToast('Switch network', 'Please switch to Sepolia and try again.', 'error');
        return;
      }

      const amountWei = parseUnits(normalized as `${number}`, 18);

      const l1WalletClient =
        walletClient ?? (await getWalletClient(wagmiConfig, { account: address, chainId: L1_SEPOLIA_CHAIN_ID }));
      if (!l1WalletClient) {
        showToast('Wallet error', 'Could not initialize wallet client.', 'error');
        return;
      }

      setIsSubmittingBridge(true);
      showToast('Bridging...', 'Confirm ETH deposit to HPP.', 'loading');

      if (!hppL1Rollup || !hppRpcUrl?.trim()) {
        showToast(
          'Bridge configuration missing',
          !hppL1Rollup
            ? 'HPP rollup is not configured for this environment. Add it in src/config/hppCore.ts for this chain.'
            : 'Set HPP RPC (e.g. NEXT_PUBLIC_HPP_RPC_URL) so the bridge can resolve the rollup.',
          'error',
        );
        return;
      }

      let depositTo: `0x${string}`;
      let depositData: `0x${string}`;
      let depositValue: bigint;

      try {
        const estimated = await getHppEthDepositTxRequest({
          l1RpcUrl: l1RpcUrlForSdk,
          l2RpcUrl: hppRpcUrl.trim(),
          l2ChainId: hppChainId,
          rollupAddress: hppL1Rollup,
          networkName: hppNetworkLabel,
          isTestnet: isSepoliaEnv,
          from: address,
          amount: amountWei,
        });
        depositTo = estimated.to;
        depositData = estimated.data;
        depositValue = estimated.value;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (process.env.NODE_ENV === 'development') {
          console.error('[hpp-portal] getHppEthDepositTxRequest failed', e);
        }
        showToast(
          'Bridge deposit estimate failed',
          `${message.slice(0, 220)}${message.length > 220 ? '…' : ''} Check HPP core config, NEXT_PUBLIC_HPP_RPC_URL, and L1 RPC.`,
          'error',
        );
        return;
      }

      const bridgeHash = await l1WalletClient.sendTransaction({
        to: depositTo,
        data: depositData,
        value: depositValue,
        account: address,
        chain: sepolia,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: bridgeHash as `0x${string}` });
      if (receipt.status === 'success') {
        const now = Date.now();
        const l1Tx = await publicClient.getTransaction({ hash: bridgeHash as `0x${string}` });
        const l1GasFeeWei = txFeeWeiFromReceiptAndTx(receipt, l1Tx);
        const nextEntry: PendingBridgeTransfer = {
          l1TxHash: bridgeHash as `0x${string}`,
          status: 'pending',
          amount: normalized,
          fromToken: fromTokenLabel,
          toToken: toTokenLabel,
          sourceNetwork: l1NetworkLabel,
          destinationNetwork: hppNetworkLabel,
          walletAddress: address,
          startedAt: now,
          updatedAt: now,
          l1GasFeeWei: l1GasFeeWei.toString(),
          l1ApproveGasFeeWei: null,
          l1TxValueWei: (l1Tx?.value ?? depositValue).toString(),
          l1BridgeDepositSource: 'estimated',
          l1BlockNumber: receipt.blockNumber.toString(),
        };
        setPendingBridgeTransfers((prev) => {
          const h = nextEntry.l1TxHash.toLowerCase();
          if (prev.some((t) => t.l1TxHash.toLowerCase() === h)) return prev;
          return [nextEntry, ...prev];
        });
        showToast('Bridge submitted', `ETH bridge request submitted.\n${BRIDGE_L2_ETA_COPY}`, 'success', {
          text: 'View on Etherscan',
          url: `${l1ExplorerBaseUrl}/tx/${bridgeHash}`,
        });
        void startBridgeTracking({
          l1TxHash: bridgeHash as `0x${string}`,
          walletAddress: address,
          amount: normalized,
          fromToken: fromTokenLabel,
          toToken: toTokenLabel,
          sourceNetwork: l1NetworkLabel,
          destinationNetwork: hppNetworkLabel,
        });
        setAmount('');
        setInputError('');
      } else {
        showToast('Bridge failed', 'Transaction failed or was reverted.', 'error');
      }
    } catch (e: any) {
      if (e?.code === 4001) {
        showToast('Transaction rejected', 'You rejected the transaction.', 'error');
      } else {
        showToast('Bridge error', 'Failed to process bridge transaction.', 'error');
      }
    } finally {
      setIsSubmittingBridge(false);
    }
  };

  const onBridgeHpp = async () => {
    try {
      if (!L1_HPP_ADDRESS || !L2_HPP_ADDRESS) {
        showToast(
          'Configuration missing',
          'Set NEXT_PUBLIC_ETH_HPP_TOKEN_CONTRACT and NEXT_PUBLIC_HPP_TOKEN_CONTRACT.',
          'error',
        );
        return;
      }
      if (!address || !isConnected) {
        showToast('Wallet required', 'Please connect your wallet first.', 'error');
        return;
      }
      if (!publicClient) {
        showToast('Network error', 'L1 public client is not available.', 'error');
        return;
      }

      const normalized = amount.replace(/,/g, '').trim();
      if (inputError) {
        showToast('Invalid amount', inputError, 'error');
        return;
      }
      if (!normalized || normalized === '.' || Number(normalized) <= 0) {
        showToast('Invalid amount', 'Enter a valid HPP amount.', 'error');
        return;
      }

      try {
        await ensureChain(L1_SEPOLIA_CHAIN_ID, {
          chainName: 'Sepolia',
          rpcUrls: [...sepolia.rpcUrls.default.http],
          nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
        });
      } catch {
        showToast('Switch network', 'Please switch to Sepolia and try again.', 'error');
        return;
      }

      const amountWei = parseUnits(normalized as `${number}`, 18);

      const l1WalletClient =
        walletClient ?? (await getWalletClient(wagmiConfig, { account: address, chainId: L1_SEPOLIA_CHAIN_ID }));
      if (!l1WalletClient) {
        showToast('Wallet error', 'Could not initialize wallet client.', 'error');
        return;
      }

      setIsSubmittingBridge(true);
      showToast('Checking allowance...', `Validating ${fromTokenLabel} approval for the L1 gateway.`, 'loading');
      const approvalContext = await readErc20GatewayApprovalContext(L1_HPP_ADDRESS);
      if (!approvalContext) {
        showToast(
          'Allowance check failed',
          'Could not read HPP allowance or L1 gateway is unset for this token on the router.',
          'error',
        );
        return;
      }
      const { spender: hppApproveSpender, allowance } = approvalContext;

      let l1ApproveGasFeeWei: string | undefined;
      if (allowance < amountWei) {
        const approveAmount = approveMax ? maxUint256 : amountWei;
        showToast(
          'Approval required',
          approveMax
            ? `Approve max ${fromTokenLabel} for the bridge gateway. Usually needed once per wallet.`
            : 'Approve only this bridge amount for the gateway.',
          'loading',
        );
        const approveHash = await l1WalletClient.writeContract({
          address: L1_HPP_ADDRESS,
          abi: standardArbErc20Abi,
          functionName: 'approve',
          args: [hppApproveSpender, approveAmount],
          account: address,
          chain: sepolia,
        });
        const approveReceipt = await publicClient.waitForTransactionReceipt({
          hash: approveHash as `0x${string}`,
        });
        if (approveReceipt.status === 'success') {
          const approveTx = await publicClient.getTransaction({ hash: approveHash as `0x${string}` });
          l1ApproveGasFeeWei = txFeeWeiFromReceiptAndTx(approveReceipt, approveTx).toString();
          setUsdcAllowanceWei(approveAmount);
        }
      }

      showToast('Bridging...', 'Confirm outboundTransfer transaction.', 'loading');

      if (!hppL1Rollup || !hppRpcUrl?.trim()) {
        showToast(
          'Bridge configuration missing',
          !hppL1Rollup
            ? 'HPP rollup is not configured for this environment. Add it in src/config/hppCore.ts for this chain.'
            : 'Set HPP RPC (e.g. NEXT_PUBLIC_HPP_RPC_URL) so the bridge can estimate the L1 deposit.',
          'error',
        );
        return;
      }

      let depositTo: `0x${string}`;
      let depositData: `0x${string}`;
      let depositValue: bigint;

      try {
        const estimated = await getHppUsdcDepositTxRequest({
          l1RpcUrl: l1RpcUrlForSdk,
          l2RpcUrl: hppRpcUrl.trim(),
          l2ChainId: hppChainId,
          rollupAddress: hppL1Rollup,
          networkName: hppNetworkLabel,
          isTestnet: isSepoliaEnv,
          from: address,
          l1TokenAddress: L1_HPP_ADDRESS,
          amount: amountWei,
        });
        depositTo = estimated.to;
        depositData = estimated.data;
        depositValue = estimated.value;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (process.env.NODE_ENV === 'development') {
          console.error('[hpp-portal] HPP getHppUsdcDepositTxRequest failed', e);
        }
        showToast(
          'Bridge deposit estimate failed',
          `${message.slice(0, 220)}${message.length > 220 ? '…' : ''} Check HPP core config, NEXT_PUBLIC_HPP_RPC_URL, and L1 RPC.`,
          'error',
        );
        return;
      }

      const bridgeHash = await l1WalletClient.sendTransaction({
        to: depositTo,
        data: depositData,
        value: depositValue,
        account: address,
        chain: sepolia,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: bridgeHash as `0x${string}` });
      if (receipt.status === 'success') {
        const now = Date.now();
        const l1Tx = await publicClient.getTransaction({ hash: bridgeHash as `0x${string}` });
        const l1GasFeeWei = txFeeWeiFromReceiptAndTx(receipt, l1Tx);
        const nextEntry: PendingBridgeTransfer = {
          l1TxHash: bridgeHash as `0x${string}`,
          status: 'pending',
          amount: normalized,
          fromToken: fromTokenLabel,
          toToken: toTokenLabel,
          sourceNetwork: l1NetworkLabel,
          destinationNetwork: hppNetworkLabel,
          walletAddress: address,
          startedAt: now,
          updatedAt: now,
          l1GasFeeWei: l1GasFeeWei.toString(),
          l1ApproveGasFeeWei: l1ApproveGasFeeWei ?? null,
          l1TxValueWei: (l1Tx?.value ?? depositValue).toString(),
          l1BridgeDepositSource: 'estimated',
          l1BlockNumber: receipt.blockNumber.toString(),
        };
        setPendingBridgeTransfers((prev) => {
          const h = nextEntry.l1TxHash.toLowerCase();
          if (prev.some((t) => t.l1TxHash.toLowerCase() === h)) return prev;
          return [nextEntry, ...prev];
        });
        showToast('Bridge submitted', `HPP bridge request submitted.\n${BRIDGE_L2_ETA_COPY}`, 'success', {
          text: 'View on Etherscan',
          url: `${l1ExplorerBaseUrl}/tx/${bridgeHash}`,
        });
        void startBridgeTracking({
          l1TxHash: bridgeHash as `0x${string}`,
          walletAddress: address,
          amount: normalized,
          fromToken: fromTokenLabel,
          toToken: toTokenLabel,
          sourceNetwork: l1NetworkLabel,
          destinationNetwork: hppNetworkLabel,
        });
        setAmount('');
        setInputError('');
      } else {
        showToast('Bridge failed', 'Transaction failed or was reverted.', 'error');
      }
    } catch (e: any) {
      if (e?.code === 4001) {
        showToast('Transaction rejected', 'You rejected the transaction.', 'error');
      } else {
        showToast('Bridge error', 'Failed to process bridge transaction.', 'error');
      }
    } finally {
      setIsSubmittingBridge(false);
    }
  };

  const onBridge = async () => {
    if (isComingSoonRoute) return;
    if (selectedRoute === 'usdc_usdce') await onBridgeUsdc();
    else if (selectedRoute === 'hpp_hpp') await onBridgeHpp();
    else if (selectedRoute === 'eth_eth') await onBridgeEth();
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(target)) {
        setIsFromDropdownOpen(false);
      }
      if (directionDropdownRef.current && !directionDropdownRef.current.contains(target)) {
        setIsDirectionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!address) {
      setPendingBridgeTransfers([]);
      setBridgeListHydratedFromStorage(false);
      return;
    }
    const normalizeTs = (value: number | undefined, fallback: number) => {
      if (!value || !Number.isFinite(value)) return fallback;
      return value < 1_000_000_000_000 ? value * 1000 : value;
    };
    const normalizeStatus = (value: string | undefined): PendingTransferStatus => {
      const s = (value || '').toLowerCase();
      if (s === 'success' || s === 'confirmed' || s === 'done' || s === 'completed') return 'success';
      if (s === 'failed' || s === 'error') return 'failed';
      return 'pending';
    };
    const normalizeItem = (parsed: PendingBridgeTransfer, now: number): PendingBridgeTransfer => {
      const startedAt = normalizeTs(parsed.startedAt, now);
      const updatedAt = normalizeTs(parsed.updatedAt, startedAt);
      return {
        ...parsed,
        startedAt,
        updatedAt,
        status: normalizeStatus(parsed.status),
      };
    };
    try {
      const raw = window.localStorage.getItem(BRIDGE_PENDING_STORAGE_KEY);
      const now = Date.now();
      const walletLc = address.toLowerCase();
      let list: PendingBridgeTransfer[] = [];
      if (raw) {
        const data = JSON.parse(raw) as unknown;
        if (Array.isArray(data)) {
          list = data
            .filter((x): x is PendingBridgeTransfer =>
              Boolean(x && typeof x === 'object' && 'l1TxHash' in x && 'walletAddress' in x),
            )
            .filter((x) => String(x.walletAddress).toLowerCase() === walletLc)
            .map((x) => normalizeItem(x, now));
        } else if (data && typeof data === 'object' && 'l1TxHash' in data && 'walletAddress' in data) {
          const one = normalizeItem(data as PendingBridgeTransfer, now);
          if (one.walletAddress.toLowerCase() === walletLc) list = [one];
        }
        const seen = new Set<string>();
        list = list.filter((t) => {
          const k = t.l1TxHash.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        list.sort((a, b) => b.startedAt - a.startedAt);
      }
      const confirmedForHistory = list.filter((t) => t.status === 'success');
      const activeAfterPrune = list.filter((t) => t.status !== 'success');
      for (const t of confirmedForHistory) {
        const row = pendingSuccessToHistoryRow(t);
        if (row) upsertBridgeHistoryCacheForWallet(walletLc, row);
      }
      setPendingBridgeTransfers(activeAfterPrune);
    } catch {
      setPendingBridgeTransfers([]);
    } finally {
      setBridgeListHydratedFromStorage(true);
    }
  }, [address]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!bridgeListHydratedFromStorage || !address) return;
    const walletLc = address.toLowerCase();
    const allMatchWallet = pendingBridgeTransfers.every((t) => t.walletAddress.toLowerCase() === walletLc);
    if (!allMatchWallet) return;

    if (pendingBridgeTransfers.length === 0) {
      window.localStorage.removeItem(BRIDGE_PENDING_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(BRIDGE_PENDING_STORAGE_KEY, JSON.stringify(pendingBridgeTransfers));
  }, [address, pendingBridgeTransfers, bridgeListHydratedFromStorage]);

  useEffect(() => {
    if (typeof window === 'undefined' || !address) return;
    const walletLc = address.toLowerCase();
    for (const t of pendingBridgeTransfers) {
      if (t.walletAddress.toLowerCase() !== walletLc) continue;
      const row = pendingSuccessToHistoryRow(t);
      if (!row) continue;
      upsertBridgeHistoryCacheForWallet(walletLc, row);
    }
  }, [address, pendingBridgeTransfers]);

  const loadBridgeHistoryList = useCallback(async () => {
    if (!address) return;
    setBridgeHistoryLoading(true);
    setBridgeHistoryError(null);
    const walletLc = address.toLowerCase();
    const local = loadBridgeHistoryCacheForWallet(walletLc);
    try {
      const base = bridgeTrackingApiBase?.trim();
      const api = base ? await fetchBridgeHistoryFromApi(base, address as `0x${string}`) : [];
      setBridgeHistoryRows(mergeBridgeHistoryPrioritizeApi(api, local));
    } catch {
      setBridgeHistoryError('Could not refresh from the server. Showing cached data.');
      setBridgeHistoryRows(mergeBridgeHistoryPrioritizeApi([], local));
    } finally {
      setBridgeHistoryLoading(false);
    }
  }, [address, bridgeTrackingApiBase]);

  const closeBridgeHistoryDrawer = useCallback(() => {
    setBridgeHistoryDrawerEntered(false);
    if (bridgeHistoryDrawerCloseTimerRef.current) {
      clearTimeout(bridgeHistoryDrawerCloseTimerRef.current);
    }
    bridgeHistoryDrawerCloseTimerRef.current = setTimeout(() => {
      setBridgeHistoryDrawerOpen(false);
      bridgeHistoryDrawerCloseTimerRef.current = null;
    }, 300);
  }, []);

  const openBridgeHistoryDrawer = useCallback(() => {
    if (!address) return;
    if (bridgeHistoryDrawerCloseTimerRef.current) {
      clearTimeout(bridgeHistoryDrawerCloseTimerRef.current);
      bridgeHistoryDrawerCloseTimerRef.current = null;
    }
    setBridgeHistoryDrawerOpen(true);
    void loadBridgeHistoryList();
  }, [address, loadBridgeHistoryList]);

  useLayoutEffect(() => {
    if (!bridgeHistoryDrawerOpen) return;
    setBridgeHistoryDrawerEntered(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBridgeHistoryDrawerEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [bridgeHistoryDrawerOpen]);

  useEffect(() => {
    if (!bridgeHistoryDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeBridgeHistoryDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bridgeHistoryDrawerOpen, closeBridgeHistoryDrawer]);

  useEffect(() => {
    if (!bridgeHistoryDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [bridgeHistoryDrawerOpen]);

  const trackingPollKey = useMemo(
    () =>
      pendingBridgeTransfers
        .filter((t) => t.status === 'pending' && t.trackingId)
        .map((t) => `${t.l1TxHash}:${t.trackingId}`)
        .sort()
        .join('|'),
    [pendingBridgeTransfers],
  );

  useEffect(() => {
    if (!bridgeTrackingApiBase || !trackingPollKey) return;
    for (const t of pendingBridgeTransfers) {
      if (t.status !== 'pending' || !t.trackingId) continue;
      if (trackingPollActiveRef.current.has(t.l1TxHash)) continue;
      trackingPollActiveRef.current.add(t.l1TxHash);
      void pollBridgeTrackingStatus(t.trackingId, t.l1TxHash).finally(() => {
        trackingPollActiveRef.current.delete(t.l1TxHash);
      });
    }
  }, [bridgeTrackingApiBase, trackingPollKey, pendingBridgeTransfers]);

  const legacyTrackingRecoverKey = useMemo(
    () =>
      pendingBridgeTransfers
        .filter((t) => t.status === 'pending' && !t.trackingId)
        .map((t) => t.l1TxHash)
        .sort()
        .join('|'),
    [pendingBridgeTransfers],
  );

  useEffect(() => {
    if (!bridgeTrackingApiBase || !legacyTrackingRecoverKey) return;
    for (const t of pendingBridgeTransfers) {
      if (t.status !== 'pending' || t.trackingId) continue;
      void startBridgeTracking({
        l1TxHash: t.l1TxHash,
        walletAddress: t.walletAddress,
        amount: t.amount,
        fromToken: t.fromToken,
        toToken: t.toToken,
        sourceNetwork: t.sourceNetwork,
        destinationNetwork: t.destinationNetwork,
      });
    }
  }, [bridgeTrackingApiBase, legacyTrackingRecoverKey]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        setL2SdkPollGeneration((g) => g + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!shouldCheckAllowance || !publicClient || !address || !l1Erc20BridgeTokenAddress) {
      setUsdcAllowanceWei(null);
      setIsAllowanceLoading(false);
      return;
    }
    let cancelled = false;
    setIsAllowanceLoading(true);
    void (async () => {
      try {
        const context = await readErc20GatewayApprovalContext(l1Erc20BridgeTokenAddress);
        if (cancelled || !context) return;
        setUsdcAllowanceWei(context.allowance);
      } catch {
        if (!cancelled) setUsdcAllowanceWei(null);
      } finally {
        if (!cancelled) setIsAllowanceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient, readErc20GatewayApprovalContext, shouldCheckAllowance, l1Erc20BridgeTokenAddress]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (hppL1Rollup) return;
    const anySdkPending = pendingBridgeTransfers.some((t) => t.status === 'pending' && !t.l2TxHash);
    if (!anySdkPending) return;
    console.warn('[hpp-portal] Rollup config is missing — the bridge UI cannot resolve the L2 tx via @arbitrum/sdk.');
  }, [hppL1Rollup, pendingBridgeTransfers]);

  const sdkL2PollKey = useMemo(
    () =>
      pendingBridgeTransfers
        .filter((t) => t.status === 'pending' && !t.l2TxHash)
        .map((t) => t.l1TxHash)
        .sort()
        .join('|'),
    [pendingBridgeTransfers],
  );

  useEffect(() => {
    if (!sdkL2PollKey || !hppL1Rollup || !hppRpcUrl) return;

    const targets = pendingBridgeTransfers.filter((t) => t.status === 'pending' && !t.l2TxHash);
    const controllers = new Map<string, AbortController>();
    for (const t of targets) {
      const ac = new AbortController();
      controllers.set(t.l1TxHash, ac);
      const l1ForThisPoll = t.l1TxHash;
      void (async () => {
        try {
          const hash = await pollL2TxHashFromBridgeL1Tx({
            l1TxHash: l1ForThisPoll,
            l1RpcUrl: l1RpcUrlForSdk,
            l2RpcUrl: hppRpcUrl,
            l2ChainId: hppChainId,
            rollupAddress: hppL1Rollup,
            networkName: hppNetworkLabel,
            isTestnet: isSepoliaEnv,
            pollIntervalMs: BRIDGE_L2_SDK_POLL_MS,
            signal: ac.signal,
          });
          if (hash && !ac.signal.aborted) {
            applyL2Resolved(l1ForThisPoll, hash);
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[hpp-portal] Bridge L2 SDK poll error', e);
          }
        }
      })();
    }

    return () => {
      controllers.forEach((c) => c.abort());
    };
  }, [
    applyL2Resolved,
    hppChainId,
    hppL1Rollup,
    hppNetworkLabel,
    hppRpcUrl,
    isSepoliaEnv,
    l1RpcUrlForSdk,
    l2SdkPollGeneration,
    sdkL2PollKey,
  ]);

  const l2GasFetchKey = useMemo(
    () =>
      pendingBridgeTransfers
        .filter((t) => t.status === 'success' && t.l2TxHash && (t.l2GasFeeWei == null || t.l2GasFeeWei === ''))
        .map((t) => `${t.l1TxHash}:${t.l2TxHash}`)
        .sort()
        .join('|'),
    [pendingBridgeTransfers],
  );

  const hasUnresolvedOnChainFields = useMemo(
    () =>
      pendingBridgeTransfers.some(
        (t) =>
          t.l1GasFeeWei == null ||
          t.l1GasFeeWei === '' ||
          t.l1MaxSubmissionCostWei == null ||
          t.l1MaxSubmissionCostWei === '' ||
          (t.status === 'success' && t.l2TxHash && (t.l2GasFeeWei == null || t.l2GasFeeWei === '')),
      ),
    [pendingBridgeTransfers],
  );

  useEffect(() => {
    if (!hasUnresolvedOnChainFields) return;
    const id = window.setInterval(() => setBridgeOnChainSyncGeneration((g) => g + 1), 10_000);
    return () => window.clearInterval(id);
  }, [hasUnresolvedOnChainFields]);

  useEffect(() => {
    if (!hppPublicClient || !l2GasFetchKey) return;

    let cancelled = false;
    const targets = pendingBridgeTransfers.filter(
      (t) => t.status === 'success' && t.l2TxHash && (t.l2GasFeeWei == null || t.l2GasFeeWei === ''),
    );
    void (async () => {
      for (const t of targets) {
        const l2Hash = t.l2TxHash!;
        try {
          const r = await hppPublicClient.getTransactionReceipt({ hash: l2Hash });
          if (cancelled || !r) continue;
          const fee = txFeeWeiFromReceipt(r);
          setPendingBridgeTransfers((prev) =>
            prev.map((row) => {
              if (row.l1TxHash !== t.l1TxHash || row.l2TxHash !== l2Hash) return row;
              if (row.l2GasFeeWei != null && row.l2GasFeeWei !== '') return row;
              return { ...row, l2GasFeeWei: fee.toString() };
            }),
          );
        } catch {
          // Receipt can lag right after confirmation.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hppPublicClient, l2GasFetchKey, bridgeOnChainSyncGeneration]);

  const l1OnChainSyncKey = useMemo(
    () => [...new Set(pendingBridgeTransfers.map((t) => t.l1TxHash))].sort().join('|'),
    [pendingBridgeTransfers],
  );

  /** Sync L1 `msg.value` and (if missing) gas from chain so UI matches the real tx—not stale JSON or client estimate. */
  useEffect(() => {
    if (!publicClient || !l1OnChainSyncKey) return;

    const uniqueL1 = [...new Set(pendingBridgeTransfers.map((t) => t.l1TxHash))];
    let cancelled = false;
    for (const l1Hash of uniqueL1) {
      void (async () => {
        try {
          const [receipt, tx] = await Promise.all([
            publicClient.getTransactionReceipt({ hash: l1Hash }),
            publicClient.getTransaction({ hash: l1Hash }),
          ]);
          if (cancelled || !tx) return;
          const retryableDecoded =
            tryDecodeCreateRetryableTicket(tx.input) ?? tryDecodeRetryableTicketFromInboxLogs(receipt?.logs);
          setPendingBridgeTransfers((prev) =>
            prev.map((row) => {
              if (row.l1TxHash !== l1Hash) return row;
              const next: Partial<PendingBridgeTransfer> = {};
              const onChainValue = tx.value.toString();
              if (row.l1TxValueWei !== onChainValue) next.l1TxValueWei = onChainValue;

              if (retryableDecoded) {
                const sub = retryableDecoded.maxSubmissionCost.toString();
                if (row.l1MaxSubmissionCostWei !== sub) next.l1MaxSubmissionCostWei = sub;
              }

              const missingFee = row.l1GasFeeWei == null || row.l1GasFeeWei === '';
              if (missingFee && receipt?.status === 'success') {
                const fee = txFeeWeiFromReceiptAndTx(receipt, tx);
                next.l1GasFeeWei = fee.toString();
                next.l1BlockNumber = row.l1BlockNumber ?? receipt.blockNumber.toString();
              }
              return Object.keys(next).length === 0 ? row : { ...row, ...next };
            }),
          );
        } catch {
          // Wrong L1 RPC or transient error.
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [publicClient, l1OnChainSyncKey, bridgeOnChainSyncGeneration]);

  useEffect(() => {
    if (!amount || amount === '.') {
      setInputError('');
      return;
    }
    if (isBalanceLoading) {
      setInputError('');
      return;
    }
    try {
      const balStr = maxAmount.replace(/,/g, '') || '0';
      const v = new Big(amount);
      const b = new Big(balStr);
      setInputError(v.gt(b) ? `Insufficient ${fromTokenLabel} balance` : '');
    } catch {
      setInputError('');
    }
  }, [amount, maxAmount, isBalanceLoading, fromTokenLabel]);

  useEffect(() => {
    if (!pendingBridgeTransfers.some((t) => t.status === 'pending')) return;
    const tick = () => setNowTs(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [pendingBridgeTransfers]);

  const bridgeBalanceRefreshKey = useMemo(
    () =>
      pendingBridgeTransfers
        .map((t) => `${t.l1TxHash}:${t.status}:${t.l2TxHash ?? ''}`)
        .sort()
        .join('|'),
    [pendingBridgeTransfers],
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setBalanceVisibilityRefetchNonce((n) => n + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadBalances = async () => {
      if (!isConnected || !address || !publicClient || !hppPublicClient) {
        if (!cancelled) {
          setFromBalance('--');
          setToBalance('--');
          setMaxAmount('0');
          setIsBalanceLoading(false);
        }
        return;
      }
      if (!cancelled) setIsBalanceLoading(true);
      try {
        if (selectedRoute === 'eth_eth') {
          const [fromRaw, toRaw] = await Promise.all([
            isReverse ? hppPublicClient.getBalance({ address }) : publicClient.getBalance({ address }),
            isReverse ? publicClient.getBalance({ address }) : hppPublicClient.getBalance({ address }),
          ]);
          if (cancelled) return;
          setFromBalance(formatBalanceView(fromRaw, 18));
          setToBalance(formatBalanceView(toRaw, 18));
          setMaxAmount(formatBalanceInput(fromRaw, 18));
          return;
        }

        if (selectedRoute === 'hpp_hpp') {
          if (!L1_HPP_ADDRESS || !L2_HPP_ADDRESS) {
            if (cancelled) return;
            setFromBalance('--');
            setToBalance('--');
            setMaxAmount('0');
            return;
          }
          const [fromRaw, toRaw] = await Promise.all([
            (isReverse ? hppPublicClient : publicClient).readContract({
              address: isReverse ? L2_HPP_ADDRESS : L1_HPP_ADDRESS,
              abi: standardArbErc20Abi,
              functionName: 'balanceOf',
              args: [address],
            }) as Promise<bigint>,
            (isReverse ? publicClient : hppPublicClient).readContract({
              address: isReverse ? L1_HPP_ADDRESS : L2_HPP_ADDRESS,
              abi: standardArbErc20Abi,
              functionName: 'balanceOf',
              args: [address],
            }) as Promise<bigint>,
          ]);
          if (cancelled) return;
          setFromBalance(formatBalanceView(fromRaw, 18));
          setToBalance(formatBalanceView(toRaw, 18));
          setMaxAmount(formatBalanceInput(fromRaw, 18));
          return;
        }

        const [fromRaw, toRaw] = await Promise.all([
          (isReverse ? hppPublicClient : publicClient).readContract({
            address: isReverse ? L2_USDCE_ADDRESS : L1_USDC_ADDRESS,
            abi: standardArbErc20Abi,
            functionName: 'balanceOf',
            args: [address],
          }) as Promise<bigint>,
          (isReverse ? publicClient : hppPublicClient).readContract({
            address: isReverse ? L1_USDC_ADDRESS : L2_USDCE_ADDRESS,
            abi: standardArbErc20Abi,
            functionName: 'balanceOf',
            args: [address],
          }) as Promise<bigint>,
        ]);
        if (cancelled) return;
        setFromBalance(formatBalanceView(fromRaw, USDC_DECIMALS));
        setToBalance(formatBalanceView(toRaw, USDC_DECIMALS));
        setMaxAmount(formatBalanceInput(fromRaw, USDC_DECIMALS));
      } catch {
        if (cancelled) return;
        setFromBalance('--');
        setToBalance('--');
        setMaxAmount('0');
      } finally {
        if (!cancelled) setIsBalanceLoading(false);
      }
    };
    void loadBalances();
    return () => {
      cancelled = true;
    };
  }, [
    selectedRoute,
    isReverse,
    isConnected,
    address,
    publicClient,
    hppPublicClient,
    L1_HPP_ADDRESS,
    L2_HPP_ADDRESS,
    bridgeBalanceRefreshKey,
    balanceVisibilityRefetchNonce,
  ]);

  const pendingStepFor = (t: PendingBridgeTransfer) => (t.status === 'success' ? 3 : t.status === 'failed' ? 2 : 2);
  const pendingDotClassFor = (t: PendingBridgeTransfer, step: number) => {
    if (t.status === 'failed' && step >= 2) return 'bg-[#b91c1c] border-[#ef4444]';
    const stepCutoff = pendingStepFor(t);
    if (step <= stepCutoff) return 'bg-primary border-primary';
    return 'bg-[#2D2D2D] border-[#2D2D2D]';
  };

  const renderBridgeTransferStatusCard = (
    pendingTransfer: PendingBridgeTransfer,
    opts?: { clipOverflowX?: boolean },
  ) => {
    const stepTimeTooltipClass = opts?.clipOverflowX
      ? 'pointer-events-none absolute left-0 top-full z-30 mt-1.5 w-max max-w-[min(18rem,calc(100vw-2.5rem))] whitespace-pre-line rounded-[6px] border border-[#2D2D2D] bg-[#111111] px-2.5 py-2 text-left text-[11px] font-medium leading-snug text-[#cfcfcf] opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover/submitted:opacity-100 group-focus-within/submitted:opacity-100'
      : 'pointer-events-none absolute left-full top-1/2 z-30 ml-2 w-max max-w-[min(17rem,calc(100vw-2rem))] -translate-y-1/2 whitespace-pre-line rounded-[6px] border border-[#2D2D2D] bg-[#111111] px-2.5 py-2 text-left text-[11px] font-medium leading-snug text-[#cfcfcf] opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover/submitted:opacity-100 group-focus-within/submitted:opacity-100';
    const confirmedTimeTooltipClass = opts?.clipOverflowX
      ? 'pointer-events-none absolute left-0 top-full z-30 mt-1.5 w-max max-w-[min(18rem,calc(100vw-2.5rem))] whitespace-pre-line rounded-[6px] border border-[#2D2D2D] bg-[#111111] px-2.5 py-2 text-left text-[11px] font-medium leading-snug text-[#cfcfcf] opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover/confirmed:opacity-100 group-focus-within/confirmed:opacity-100'
      : 'pointer-events-none absolute left-full top-1/2 z-30 ml-2 w-max max-w-[min(17rem,calc(100vw-2rem))] -translate-y-1/2 whitespace-pre-line rounded-[6px] border border-[#2D2D2D] bg-[#111111] px-2.5 py-2 text-left text-[11px] font-medium leading-snug text-[#cfcfcf] opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover/confirmed:opacity-100 group-focus-within/confirmed:opacity-100';

    return (
      <div
        className={`rounded-[8px] border border-[#2D2D2D] bg-[#111111] p-4 ${
          opts?.clipOverflowX ? 'overflow-x-hidden' : 'overflow-visible'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <BridgeTransferHeaderSummary transfer={pendingTransfer} renderIconBadge={renderIconBadge} />
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              pendingTransfer.status === 'success'
                ? 'bg-[#0f2a1b] text-[#4ade80]'
                : pendingTransfer.status === 'failed'
                  ? 'bg-[#2a1313] text-[#f87171]'
                  : 'bg-[#171735] text-primary animate-pulse'
            }`}
          >
            {pendingTransfer.status === 'success'
              ? 'Confirmed'
              : pendingTransfer.status === 'failed'
                ? 'Failed'
                : 'Verifying'}
          </span>
        </div>
        <div className="mt-2 space-y-1 text-xs leading-snug text-[#8f8f8f]">
          <p className="leading-relaxed">
            {hasL1ApproveGasThisSession(pendingTransfer) ? (
              <span
                className="group/l1gas relative inline-flex max-w-full cursor-help flex-wrap items-baseline rounded px-0.5 -mx-0.5 align-baseline outline-offset-2 focus-within:outline focus-within:outline-2 focus-within:outline-primary"
                tabIndex={0}
                aria-label={l1GasBreakdownTooltipText(pendingTransfer)}
              >
                <span className="text-[#6b6b6b]">L1 gas fee </span>
                <span className="text-[#cfcfcf]">{formatWeiAsEthCompact(sumL1GasWei(pendingTransfer).toString())}</span>
                <span
                  className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 w-max max-w-[min(17rem,calc(100vw-2rem))] whitespace-pre-line rounded-[6px] border border-[#2D2D2D] bg-[#111111] px-2.5 py-2 text-left text-[11px] font-medium leading-snug text-[#cfcfcf] opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover/l1gas:opacity-100 group-focus-within/l1gas:opacity-100"
                  role="tooltip"
                >
                  {l1GasBreakdownTooltipText(pendingTransfer)}
                </span>
              </span>
            ) : (
              <>
                <span className="text-[#6b6b6b]">L1 gas fee </span>
                <span className="text-[#cfcfcf]">{formatWeiAsEthCompact(sumL1GasWei(pendingTransfer).toString())}</span>
              </>
            )}
            {pendingTransfer.l1MaxSubmissionCostWei ? (
              <>
                <span className="mx-1 text-[#cfcfcf]">+</span>
                <span
                  className="group/proto relative inline-flex cursor-help items-baseline rounded px-0.5 -mx-0.5 outline-offset-2 focus-within:outline focus-within:outline-2 focus-within:outline-primary"
                  tabIndex={0}
                  aria-label={protocolFeeTooltipText(pendingTransfer)}
                >
                  <span className="text-[#6b6b6b]">Protocol fee </span>
                  <span className="ml-0.5 text-[#cfcfcf]">
                    {formatWeiAsEthCompact(pendingTransfer.l1MaxSubmissionCostWei)}
                  </span>
                  <span
                    className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 w-max max-w-[min(18rem,calc(100vw-2rem))] whitespace-pre-line rounded-[6px] border border-[#2D2D2D] bg-[#111111] px-2.5 py-2 text-left text-[11px] font-medium leading-snug text-[#cfcfcf] opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover/proto:opacity-100 group-focus-within/proto:opacity-100"
                    role="tooltip"
                  >
                    {protocolFeeTooltipText(pendingTransfer)}
                  </span>
                </span>
              </>
            ) : null}
          </p>
          <p className="leading-relaxed">
            <span className="text-[#6b6b6b]">L2 gas fee </span>
            <span className="text-[#cfcfcf]">
              {pendingTransfer.status === 'pending' ? (
                <span className="inline-flex items-center align-middle text-[#8f8f8f]" aria-label="Calculating">
                  <svg
                    className="block h-3.5 w-3.5 translate-y-[0.5px] animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path
                      className="opacity-90"
                      d="M22 12a10 10 0 0 1-10 10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              ) : (
                formatWeiAsEthCompact(pendingTransfer.l2GasFeeWei)
              )}
            </span>
          </p>
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-1 gap-y-2 sm:gap-x-2">
          <div className="flex min-w-0 items-center gap-1 px-0.5 py-0.5 sm:gap-2 sm:px-1 sm:-mx-1">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full border ${pendingDotClassFor(pendingTransfer, 1)}`} />
            <span
              className="group/submitted relative min-w-0 cursor-help text-[11px] leading-snug text-[#cfcfcf] outline-offset-2 focus-within:outline focus-within:outline-2 focus-within:outline-primary sm:inline-flex sm:items-center sm:text-xs"
              tabIndex={0}
              aria-label={`L1 submitted ${formatBridgeLocalDateTime(pendingTransfer.startedAt)}`}
            >
              <span className="break-words">Submitted (L1)</span>
              <span className={stepTimeTooltipClass} role="tooltip">
                {formatBridgeLocalDateTime(pendingTransfer.startedAt)}
              </span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1 px-0.5 py-0.5 sm:gap-2 sm:px-1 sm:-mx-1">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full border ${pendingDotClassFor(pendingTransfer, 2)} ${
                pendingTransfer.status === 'pending' ? 'animate-pulse' : ''
              }`}
            />
            <span className="break-words text-[11px] leading-snug text-[#cfcfcf] sm:text-xs">Waiting (L2)</span>
          </div>
          {pendingTransfer.status === 'success' ? (
            <div className="flex min-w-0 items-center gap-1 px-0.5 py-0.5 sm:gap-2 sm:px-1 sm:-mx-1">
              <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full border ${pendingDotClassFor(pendingTransfer, 3)}`}
                />
                <span
                  className="group/confirmed relative min-w-0 cursor-help text-[11px] leading-snug text-[#cfcfcf] outline-offset-2 focus-within:outline focus-within:outline-2 focus-within:outline-primary sm:inline-flex sm:items-center sm:text-xs"
                  tabIndex={0}
                  aria-label={`L2 confirmed ${formatBridgeLocalDateTime(pendingTransfer.updatedAt)}`}
                >
                  <span className="break-words">Confirmed (HPP)</span>
                  <span className={confirmedTimeTooltipClass} role="tooltip">
                    {formatBridgeLocalDateTime(pendingTransfer.updatedAt)}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-1 px-0.5 py-0.5 sm:gap-2 sm:px-1 sm:-mx-1">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full border ${pendingDotClassFor(pendingTransfer, 3)}`} />
              <span className="break-words text-[11px] leading-snug text-[#cfcfcf] sm:text-xs">Confirmed (HPP)</span>
            </div>
          )}
        </div>

        {pendingTransfer.status === 'pending' && (
          <div className="mt-3 rounded-full bg-[#1b1b1b] p-1">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-primary/40 via-primary/70 to-primary/40 animate-pulse" />
          </div>
        )}

        <div className="relative mt-4 flex min-w-0 max-w-full flex-wrap items-center gap-2 overflow-visible">
          <a
            href={`${l1ExplorerBaseUrl}/tx/${pendingTransfer.l1TxHash}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`L1 transaction ${pendingTransfer.l1TxHash} on ${l1NetworkLabel}`}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[#0784C3]/55 bg-[#0b1720] px-2.5 py-1.5 text-xs text-white transition-colors hover:border-[#0784C3]/85 hover:bg-[#0e2230]"
          >
            <span className="shrink-0 rounded-md bg-[#0784C3]/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#78c8f0]">
              L1
            </span>
            <span className="font-mono text-[11px] text-[#cfefff]">{shortHash(pendingTransfer.l1TxHash)}</span>
          </a>
          {pendingTransfer.l2TxHash ? (
            <a
              href={`${hppScannerBaseUrl}/tx/${pendingTransfer.l2TxHash}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`L2 transaction ${pendingTransfer.l2TxHash} on ${hppNetworkLabel}`}
              className="inline-flex items-center gap-2 rounded-[10px] border border-primary/55 bg-primary/10 px-2.5 py-1.5 text-xs text-white transition-colors hover:border-primary/80 hover:bg-primary/15"
            >
              <span className="shrink-0 rounded-md bg-primary/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e9e9ff]">
                L2
              </span>
              <span className="font-mono text-[11px] text-[#f0ecff]">{shortHash(pendingTransfer.l2TxHash)}</span>
            </a>
          ) : pendingTransfer.status === 'success' ? (
            <span className="inline-flex items-center rounded-[10px] border border-[#1f3f2a] bg-[#0f2a1b] px-3 py-1.5 text-xs text-[#4ade80]">
              Confirmed on HPP
            </span>
          ) : (
            <span className="group relative inline-flex cursor-help items-center gap-1 rounded-[10px] border border-[#2D2D2D] bg-[#141414] px-3 py-1.5 text-xs text-[#8f8f8f]">
              Awaiting L2 confirmation
              <span className="h-1 w-1 rounded-full bg-[#8f8f8f] animate-pulse" />
              <span className="h-1 w-1 rounded-full bg-[#8f8f8f] animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="h-1 w-1 rounded-full bg-[#8f8f8f] animate-pulse" style={{ animationDelay: '300ms' }} />
              <span
                className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-[#2D2D2D] bg-[#111111] px-2.5 py-1.5 text-center text-[11px] font-medium text-[#cfcfcf] opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover:opacity-100"
                role="tooltip"
              >
                {bridgeL2EtaTooltip(pendingTransfer.startedAt, nowTs, l2EtaMaxMs)}
              </span>
            </span>
          )}
        </div>

        <div className="mt-3 text-xs leading-relaxed text-[#8f8f8f]">
          {pendingTransfer.status === 'pending' ? (
            <>
              <p>Elapsed {formatPendingDuration(pendingTransfer.startedAt)}.</p>
              {!(hppL1Rollup && hppRpcUrl) ? (
                <p className="mt-2 text-[11px] text-[#8a8a8a]">
                  Automatic L2 detection needs HPP rollup + RPC config. You can still confirm on the{' '}
                  <a
                    href={hppScannerBaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    HPP explorer
                  </a>
                  .
                </p>
              ) : null}
            </>
          ) : pendingTransfer.status === 'success' ? (
            <p>Completed in {formatElapsedBetweenMs(pendingTransfer.startedAt, pendingTransfer.updatedAt)}.</p>
          ) : (
            <p>Stopped after {formatElapsedBetweenMs(pendingTransfer.startedAt, pendingTransfer.updatedAt)}.</p>
          )}
        </div>
      </div>
    );
  };

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
          {/* Hero Section */}
          <div className="py-12.5">
            <div className="px-5 max-w-6xl mx-auto">
              <div className="w-full flex justify-center">
                <DotLottieReact
                  src="/lotties/Bridge.lottie"
                  autoplay
                  loop
                  className="w-[80px] h-[80px]"
                  renderConfig={{
                    autoResize: true,
                    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2,
                    freezeOnOffscreen: true,
                  }}
                  layout={{ fit: 'contain', align: [0.5, 0.5] }}
                />
              </div>
              <h1 className="text-[50px] leading-[1.5] font-[900] text-white text-center">Bridge</h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-5xl text-center">
                HPP Bridge enables seamless and secure token transfers across multiple networks, ensuring
                interoperability within the HPP ecosystem.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 max-w-6xl mx-auto mt-20">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl leading-[1.5] font-[900] text-white">Arbitrum Official Bridge Widget</h2>
                <p className="text-base text-[#bfbfbf] leading-[1.5]">
                  Embedded bridge interface for HPP Mainnet transfers.
                </p>
              </div>
              {showNativeBridge && isConnected && address ? (
                <button
                  type="button"
                  onClick={openBridgeHistoryDrawer}
                  aria-label="Bridge history"
                  title="Bridge history"
                  className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-[#2D2D2D] bg-[#111111] p-2.5 text-white transition-colors hover:bg-[#1a1a1a]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              ) : null}
            </div>

            {/* Arbitrum Bridge Widget — fills up to 840px wide so it matches the embed layout better than fixed 540 */}
            <div className="mb-5 rounded-[5px] p-4 sm:p-5 overflow-x-auto scrollbar-hide">
              <div
                className="relative mx-auto w-full max-w-[840px] overflow-hidden rounded-[4px]"
                style={{ height: 920 }}
              >
                <iframe
                  title="Arbitrum Bridge Widget"
                  src={arbitrumBridgeHref}
                  width={840}
                  height={920}
                  allow="clipboard-write"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                  style={{ backgroundColor: 'transparent' }}
                />
              </div>
            </div>

            {/* HPP Native Bridge (temporarily hidden) */}
            {showNativeBridge && (
              <div className="rounded-[5px] bg-[#121212] border border-[#2D2D2D] p-6 min-[810px]:p-7.5">
                <div>
                  <div className="rounded-[8px] bg-[#1c1c1c] border border-[#2D2D2D] p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="relative inline-block" ref={directionDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsDirectionDropdownOpen((prev) => !prev)}
                          className="inline-flex items-center gap-2 rounded-[14px] border border-[#2D2D2D] bg-[#111111] px-4 py-2 text-white cursor-pointer"
                        >
                          <span className="text-[#bfbfbf]">From:</span>
                          {renderIconBadge(fromNetworkLabel)}
                          <span>{fromNetworkLabel}</span>
                          <svg className="w-4 h-4 text-[#bfbfbf]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isDirectionDropdownOpen && (
                          <div className="absolute z-20 mt-2 right-0 w-fit min-w-[120px] bg-[#111111] border border-[#2D2D2D] rounded-[5px] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setBridgeDirection('eth_to_hpp');
                                setIsDirectionDropdownOpen(false);
                              }}
                              className={`flex w-full items-center gap-2 text-left px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                                bridgeDirection === 'eth_to_hpp'
                                  ? 'bg-primary text-white'
                                  : 'text-[#bfbfbf] hover:bg-[#1a1a1a] hover:text-white'
                              }`}
                            >
                              {renderIconBadge(l1NetworkLabel)}
                              {l1NetworkLabel}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBridgeDirection('hpp_to_eth');
                                setIsDirectionDropdownOpen(false);
                              }}
                              className={`flex w-full items-center gap-2 text-left px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                                bridgeDirection === 'hpp_to_eth'
                                  ? 'bg-primary text-white'
                                  : 'text-[#bfbfbf] hover:bg-[#1a1a1a] hover:text-white'
                              }`}
                            >
                              {renderIconBadge(hppNetworkLabel)}
                              {hppNetworkLabel}
                            </button>
                          </div>
                        )}
                      </div>
                      {showUnlimitedApprovalOption ? (
                        <label
                          className="group/approve relative inline-flex items-center gap-2 text-sm text-[#bfbfbf]"
                          aria-label="Unlimited approval (recommended)"
                        >
                          <input
                            type="checkbox"
                            className="peer h-4 w-4 accent-[var(--color-primary)]"
                            checked={approveMax}
                            onChange={(e) => setApproveMax(e.target.checked)}
                            disabled={isSubmittingBridge}
                          />
                          Unlimited approval (recommended)
                          <span
                            className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-max max-w-[min(22rem,calc(100vw-2rem))] whitespace-pre-line rounded-[6px] border border-[#2D2D2D] bg-[#111111] px-2.5 py-2 text-left text-[11px] font-medium leading-snug text-[#cfcfcf] opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover/approve:opacity-100 peer-focus-visible:opacity-100"
                            role="tooltip"
                          >
                            Standard ERC-20 approval.
                            {`\nApprove unlimited ${fromTokenLabel} for this bridge once.`}
                            {'\n'}No extra approval needed next time.
                            {'\n'}Uncheck to approve only the exact amount.
                          </span>
                        </label>
                      ) : null}
                    </div>

                    <div className="rounded-[10px] bg-[#111111] border border-[#2D2D2D] px-5 py-6 min-[810px]:py-7">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="\\d*\\.?\\d*"
                            min="0"
                            value={formatDisplayAmount(amount)}
                            onChange={(e) => handleBridgeAmountChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            onWheel={(e) => {
                              (e.target as HTMLInputElement).blur();
                            }}
                            placeholder="0.00"
                            className={`w-full bg-transparent text-[40px] font-semibold leading-[1.2] tracking-[0.8px] outline-none placeholder:text-white/60 ${
                              inputError ? 'text-[#FF1312]' : 'text-white'
                            }`}
                          />
                          <span className="pointer-events-none absolute top-0 left-0 invisible whitespace-pre text-[40px] font-semibold leading-[1.2] tracking-[0.8px]">
                            {formatDisplayAmount(amount || '0.00')}
                          </span>
                        </div>
                        <div className="relative shrink-0" ref={fromDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsFromDropdownOpen((prev) => !prev)}
                            className="inline-flex items-center gap-2 rounded-[14px] border border-[#2D2D2D] bg-[#1c1c1c] px-3 py-2 text-white text-xl leading-none whitespace-nowrap cursor-pointer"
                          >
                            {renderIconBadge(fromTokenLabel)}
                            <span>{fromTokenLabel}</span>
                            <svg
                              className="w-4 h-4 text-[#bfbfbf]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {isFromDropdownOpen && (
                            <div className="absolute z-20 right-0 mt-2 w-fit min-w-full bg-[#111111] border border-[#2D2D2D] rounded-[5px] overflow-hidden">
                              {(Object.keys(routeConfig) as NativeBridgeRoute[]).map((route) => (
                                <button
                                  key={route}
                                  type="button"
                                  onClick={() => {
                                    setSelectedRoute(route);
                                    setIsFromDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center gap-2 text-left px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                                    selectedRoute === route
                                      ? 'bg-primary text-white'
                                      : 'text-[#bfbfbf] hover:bg-[#1a1a1a] hover:text-white'
                                  }`}
                                >
                                  {renderIconBadge(routeOptionLabel(route))}
                                  {routeOptionLabel(route)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex w-full items-center justify-end text-base font-semibold leading-[1.2] tracking-[0.8px] text-[#bfbfbf]">
                        <span>
                          Balance:{' '}
                          {isConnected
                            ? isBalanceLoading || fromBalance === '--'
                              ? '—'
                              : `${fromBalance} ${fromTokenLabel}`
                            : `— ${fromTokenLabel}`}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2.5">
                        {PERCENTS.map((p) => {
                          const label = p === 1 ? 'Max' : `${Math.round(p * 100)}%`;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setBridgePercent(p)}
                              disabled={isBalanceLoading || isComingSoonRoute || !isConnected}
                              className="cursor-pointer rounded-full border border-[#2D2D2D] bg-[#1c1c1c] px-5 py-2 text-base font-normal leading-none text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:outline-none"
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 -my-3 flex justify-center">
                    <div className="group relative flex items-center justify-center">
                      <button
                        type="button"
                        onClick={onBridge}
                        disabled={isBridgeActionDisabled}
                        className="w-14 h-14 rounded-full bg-[#121212] border border-primary flex items-center justify-center text-primary shadow-[0_0_12px_rgba(73,73,180,0.25)] cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-[0_0_18px_rgba(73,73,180,0.4)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_0_12px_rgba(73,73,180,0.25)]"
                        aria-label={bridgeTooltipLabel}
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.2}
                            d="M12 5v14M7 14l5 5 5-5"
                          />
                        </svg>
                      </button>
                      <span className="pointer-events-none absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-[#2D2D2D] bg-[#111111] px-2.5 py-1 text-xs font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        {bridgeTooltipLabel}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[8px] bg-[#1c1c1c] border border-[#2D2D2D] p-4">
                    <div className="mb-4">
                      <div className="inline-flex items-center gap-2 rounded-[14px] border border-[#2D2D2D] bg-[#111111] px-4 py-2 text-white">
                        <span className="text-[#bfbfbf]">To:</span>
                        {renderIconBadge(toNetworkLabel)}
                        <span>{toNetworkLabel}</span>
                      </div>
                    </div>
                    <div className="rounded-[10px] bg-[#111111] border border-[#2D2D2D] px-5 py-6 min-[810px]:py-7">
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className={`min-w-0 flex-1 truncate text-[40px] font-semibold leading-[1.2] tracking-[0.8px] ${
                            amount.trim() ? 'text-white' : 'text-white/60'
                          }`}
                          aria-live="polite"
                        >
                          {formatDisplayAmount(amount) || '0.00'}
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-2 rounded-[14px] border border-[#2D2D2D] bg-[#1c1c1c] px-3 py-2 text-white text-xl leading-none whitespace-nowrap">
                          {renderIconBadge(toTokenLabel)}
                          {toTokenLabel}
                        </span>
                      </div>
                      <div className="mt-3 flex w-full items-center justify-end text-base font-semibold leading-[1.2] tracking-[0.8px] text-[#bfbfbf]">
                        <span>
                          Balance:{' '}
                          {isConnected
                            ? isBalanceLoading || toBalance === '--'
                              ? '—'
                              : `${toBalance} ${toTokenLabel}`
                            : `— ${toTokenLabel}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  {/* Wallet connect is handled by the sticky header; avoid duplicate CTA here. */}
                </div>

                {isConnected && pendingBridgeTransfers.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">Bridging status</h3>
                      {pendingBridgeTransfers.length > 1 ? (
                        <span className="text-xs font-normal text-[#8f8f8f]">
                          {pendingBridgeTransfers.length} transfers
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-4">
                      {pendingBridgeTransfers.map((pendingTransfer) => (
                        <Fragment key={pendingTransfer.l1TxHash}>
                          {renderBridgeTransferStatusCard(pendingTransfer)}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bridge links (same Arbitrum URL as embedded widget) */}
            <div className="mt-16 pt-10 border-t border-[#2D2D2D]">
              <div className="mb-5">
                <h2 className="text-3xl leading-[1.5] font-[900] text-white">External Bridge Links</h2>
                <p className="text-base text-[#bfbfbf] leading-[1.5]">
                  Direct links to bridge interfaces. The Arbitrum entry opens the same official bridge as the Bridge
                  Widget above, in a new tab.
                </p>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Arbitrum Official Bridge — same URL as embedded widget */}
                <div className="relative rounded-[5px] p-6 bg-primary flex flex-col">
                  <span className="absolute top-5 right-5 shrink-0 rounded-full border border-[#1f3f2a] bg-[#0f2a1b] px-2.5 py-1 text-xs font-semibold leading-none text-[#4ade80]">
                    Canonical Bridge
                  </span>
                  <div className="flex flex-col items-start gap-2.5 flex-1 pr-24 md:pr-0">
                  <Image src={ARB} alt="Arbitrum" width={30} height={30} />
                  <h3 className="text-white text-xl font-semibold leading-[1.5]">Arbitrum Official Bridge</h3>
                  <p className="text-white/90 text-base text-normal leading-[1.5] max-w-md">
                    The most secure way to transfer assets between Ethereum and Arbitrum, ideal for high-value or
                    long-term holdings.
                  </p>
                </div>
                <div className="pt-6">
                  <Button variant="white" size="lg" href={arbitrumBridgeHref} external className="cursor-pointer">
                    Go to Bridge
                  </Button>
                </div>
              </div>

              {/* Orbiter Bridge */}
                <div className="relative rounded-[5px] p-6 bg-primary flex flex-col">
                  <span className="absolute top-5 right-5 shrink-0 rounded-full border border-[#0784C3]/50 bg-[#0b1720] px-2.5 py-1 text-xs font-semibold leading-none text-[#93c5fd]">
                    Liquidity Bridge
                  </span>
                  <div className="flex flex-col items-start gap-2.5 flex-1 pr-24 md:pr-0">
                  <Image src={Orbiter} alt="Orbiter" width={30} height={30} />
                  <h3 className="text-white text-xl font-semibold leading-[1.5]">Orbiter Bridge</h3>
                  <p className="text-white/90 text-base text-normal leading-[1.5] max-w-md">
                    A fast, low-cost solution for moving assets, ideal for quick transfers and multi-chain activity.
                  </p>
                </div>
                <div className="pt-6">
                    <Button variant="white" size="lg" href={orbiterBridgeHref} external className="cursor-pointer">
                    Go to Bridge
                  </Button>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] mt-5 mb-25">
                The Arbitrum link goes to Arbitrum’s official bridge (same URL as the embedded widget). Orbiter is an
                independent third-party service. HPP does not operate these interfaces and is not responsible for their
                security or for any loss from using them.
            </p>
            </div>

            {/* FAQ */}
            <FaqSection items={bridgeData.faq} className="mb-20" />
          </div>

          {bridgeHistoryDrawerOpen && (
            <div className="fixed inset-0 z-[60] overflow-x-hidden" role="presentation">
              <button
                type="button"
                aria-label="Close bridge history"
                className={`absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
                  bridgeHistoryDrawerEntered ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={closeBridgeHistoryDrawer}
              />
              <aside
                className={`fixed inset-y-0 right-0 z-[61] flex w-full max-w-full min-w-0 flex-col overflow-x-hidden border-l border-[#2D2D2D] bg-[#121212] shadow-[-16px_0_48px_rgba(0,0,0,0.55)] transition-transform duration-300 ease-out sm:max-w-md md:max-w-lg ${
                  bridgeHistoryDrawerEntered ? 'translate-x-0' : 'translate-x-full'
                }`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="bridge-history-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#2D2D2D] px-5 py-4">
                  <h3
                    id="bridge-history-title"
                    className="min-w-0 flex-1 text-sm font-semibold text-white sm:flex-none"
                  >
                    Bridge history
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void loadBridgeHistoryList()}
                      disabled={bridgeHistoryLoading}
                      aria-label="Refresh"
                      title="Refresh"
                      className="inline-flex cursor-pointer items-center justify-center rounded-[10px] border border-[#2D2D2D] bg-[#111111] p-2 text-[#bfbfbf] transition-colors hover:border-[#3d3d3d] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg
                        className={`h-5 w-5 ${bridgeHistoryLoading ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Close"
                      className="cursor-pointer rounded-[10px] border border-[#2D2D2D] bg-[#111111] p-2 text-white transition-colors hover:border-[#3d3d3d] hover:bg-[#1a1a1a]"
                      onClick={closeBridgeHistoryDrawer}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
                  {bridgeHistoryError ? <p className="mb-3 text-sm text-amber-200/90">{bridgeHistoryError}</p> : null}
                  {bridgeHistoryLoading && bridgeHistoryRows.length === 0 ? (
                    <p className="text-sm text-[#bfbfbf]">Loading…</p>
                  ) : bridgeHistoryRows.length === 0 ? (
                    <p className="text-sm text-[#bfbfbf]">No confirmed transfers yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {bridgeHistoryRows.map((row) => (
                        <Fragment key={row.l1TxHash.toLowerCase()}>
                          {renderBridgeTransferStatusCard(historyRowToPendingTransfer(row), {
                            clipOverflowX: true,
                          })}
                        </Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}

          <Footer />
        </main>
      </div>
    </div>
  );
}
