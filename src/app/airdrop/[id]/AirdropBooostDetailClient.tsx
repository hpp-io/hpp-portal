"use client";

import React, { useState, useEffect, useMemo } from "react";
import "@reown/appkit-ui";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import Button from "@/components/ui/Button";
import { navItems, legalLinks } from "@/config/navigation";
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { useAppKit } from "@reown/appkit/react";
import axios from "axios";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Image from "next/image";
import { HPPTickerIcon } from "@/assets/icons";
import { getAirdropHeroImage } from "@/lib/airdropAssets";
import FaqSection from "@/components/ui/Faq";
import DontMissAirdrop from "@/components/ui/DontMissAirdrop";
import { getStaticAirdropDetailById, getAirdropFaqForEvent, getAirdropAdminApiBaseUrl } from "@/config/airdrops";
import { formatUnits } from "viem";
import { useHppPublicClient, useHppChain } from "@/app/staking/hppClient";
import { formatTokenBalance } from "@/lib/helpers";
import Big from "big.js";
import dayjs from "@/lib/dayjs";
import { hppPartyKnightsRewardABI } from "../abi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAirdropDetailLoading, setAirdropDetail } from "@/store/slices";
import { useToast } from "@/hooks/useToast";
import { useEnsureChain } from "@/hooks/useWallet";
import { config as wagmiConfig } from "@/config/walletConfig";
import { getHppExplorerBaseUrl } from "@/lib/hppExplorer";

function formatClaimPeriodBadge(start?: string, end?: string) {
  const normalize = (v?: string) => {
    if (!v) return "";
    return String(v).split(",")[0]?.trim() ?? "";
  };
  const s = normalize(start);
  const e = normalize(end);
  if (!s || !e) return "";
  return `${s} ~ ${e}`;
}

function BooostClaimPeriodBadge({ start, end }: { start?: string; end?: string }) {
  return (
    <div className="mt-4">
      <span className="inline-flex items-center rounded-[5px] bg-[#4949B4] px-3 py-1.5 text-white text-base font-semibold leading-[1.2] tracking-[0.8px]">
        Claim Period: {formatClaimPeriodBadge(start, end)}
      </span>
    </div>
  );
}

function formatBooostNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "" || value === "-") return "-";
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

type BooostNftLine = {
  label: string;
  count: number;
  hppTotal: number;
};

type BooostNftRates = {
  hppPerPoint: number;
  bylHppRate: number;
  tzrkt: number;
  common: number;
  uncommon: number;
  rare: number;
};

type BooostProfileState = {
  username: string;
  isBooostUser: boolean | null;
  byl: string;
  bylHppTotal: number | null;
  nfts: BooostNftLine[];
  estimatedReward: string | null;
  isEligible: boolean;
  loading: boolean;
};

const EMPTY_BOOOST_PROFILE: BooostProfileState = {
  username: "-",
  isBooostUser: null,
  byl: "-",
  bylHppTotal: null,
  nfts: [],
  estimatedReward: null,
  isEligible: false,
  loading: false,
};

function parseBooostNftRates(raw: unknown): BooostNftRates | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const hppPerPoint = Number(row.hppPerPoint);
  const bylHppRateRaw = Number(row.bylHppRate);
  const bylHppRate = Number.isFinite(bylHppRateRaw) ? bylHppRateRaw : hppPerPoint;
  const tzrkt = Number(row.tzrkt);
  const common = Number(row.common);
  const uncommon = Number(row.uncommon);
  const rare = Number(row.rare);
  if (![tzrkt, common, uncommon, rare, hppPerPoint, bylHppRate].every((n) => Number.isFinite(n))) return null;
  return { hppPerPoint, bylHppRate, tzrkt, common, uncommon, rare };
}

function mapBooostApiRow(row: Record<string, unknown>, rates: BooostNftRates | null): BooostProfileState {
  const username = String(row.username ?? "").trim() || "-";
  // email 없음 = unlinked (not a Booost user). username은 linked여도 비어 있을 수 있음.
  const email = String(row.email ?? "").trim();
  const bylRaw = row.bylBalance ?? row.byl ?? row.BYL;
  const hppRaw = row.hppAmount;
  const hppAmount = hppRaw !== undefined && hppRaw !== null && String(hppRaw).trim() !== "" ? String(hppRaw) : null;
  const isEligible = Boolean(hppAmount && new Big(hppAmount).gt(0));

  return {
    username,
    isBooostUser: Boolean(email),
    byl: bylRaw !== undefined && bylRaw !== null ? String(bylRaw) : "-",
    bylHppTotal:
      bylRaw !== undefined && bylRaw !== null && rates ? Number(bylRaw) * rates.bylHppRate : null,
    nfts: buildBooostNftLines(row, rates),
    estimatedReward: hppAmount,
    isEligible,
    loading: false,
  };
}

function buildBooostNftLines(row: Record<string, unknown>, rates: BooostNftRates | null): BooostNftLine[] {
  return [
    { label: "TZRKT", count: Number(row.tzrktCount ?? 0) || 0, rate: rates?.tzrkt ?? 0 },
    { label: "Common", count: Number(row.commonCount ?? 0) || 0, rate: rates?.common ?? 0 },
    { label: "Uncommon", count: Number(row.uncommonCount ?? 0) || 0, rate: rates?.uncommon ?? 0 },
    { label: "Rare", count: Number(row.rareCount ?? 0) || 0, rate: rates?.rare ?? 0 },
  ].map(({ label, count, rate }) => ({
    label,
    count,
    hppTotal: count * rate,
  }));
}

function BooostOverviewCard({
  isVestingLoading,
  claimableAmount,
  isClaiming,
  onClaim,
  profile,
}: {
  isVestingLoading: boolean;
  claimableAmount: string | null;
  isClaiming: boolean;
  onClaim: () => void;
  profile: BooostProfileState;
}) {
  const hasOnChainClaimable = Boolean(claimableAmount && new Big(claimableAmount).gt(0));
  const rewardAmount = hasOnChainClaimable ? claimableAmount : profile.estimatedReward;
  // Claim requires on-chain claimable amount (contract not live yet → stay disabled).
  const isDisabled = isVestingLoading || isClaiming || !hasOnChainClaimable;
  const isRewardLoading = isVestingLoading || profile.loading;

  return (
    <div className="bg-[#121212] rounded-lg border border-[#2D2D2D] mb-5 overflow-hidden">
      <div className="grid grid-cols-1 min-[800px]:grid-cols-3 border-b border-[#2D2D2D]">
        <div className="px-4 py-4 border-b border-[#2D2D2D] min-[800px]:border-b-0 min-[800px]:border-r">
          <div className="inline-flex items-center rounded-full bg-[#202C63] px-3 py-1 text-[#94A8FF] text-sm font-normal leading-[1] tracking-[0.8px]">
            Username
          </div>
          <div className="mt-1.5 text-white text-xl font-semibold leading-[1.2] tracking-[0]">
            {profile.loading ? "..." : profile.username}
          </div>
          {!profile.loading && profile.isBooostUser !== null ? (
            <p className="mt-1.5 text-[#bfbfbf] text-sm leading-[1.4] tracking-[0.4px]">
              You are {profile.isBooostUser ? "" : "not "}a Booost user.
            </p>
          ) : null}
        </div>
        <div className="px-4 py-4 border-b border-[#2D2D2D] min-[800px]:border-b-0 min-[800px]:border-r">
          <div className="inline-flex items-center rounded-full bg-[#202C63] px-3 py-1 text-[#94A8FF] text-sm font-normal leading-[1] tracking-[0.8px]">
            BYL
          </div>
          <div className="mt-1.5 text-white text-xl font-semibold leading-[1.2] tracking-[0]">
            {profile.loading ? (
              "..."
            ) : (
              (() => {
                const bylDisplay = formatBooostNumber(profile.byl);
                const hasByl = bylDisplay !== "-";
                return (
                  <>
                    {hasByl ? `${bylDisplay} BYL` : "-"}
                    {hasByl && profile.bylHppTotal !== null && Number.isFinite(profile.bylHppTotal) ? (
                      <span className="font-normal whitespace-nowrap">
                        {" "}
                        (= {formatBooostNumber(profile.bylHppTotal)} HPP)
                      </span>
                    ) : null}
                  </>
                );
              })()
            )}
          </div>
        </div>
        <div className="px-4 py-4">
          <div className="inline-flex items-center rounded-full bg-[#202C63] px-3 py-1 text-[#94A8FF] text-sm font-normal leading-[1] tracking-[0.8px]">
            NFT
          </div>
          <div className="mt-1.5 text-white text-sm font-semibold leading-[1.4] tracking-[0]">
            {profile.loading ? (
              <span>...</span>
            ) : profile.nfts.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {profile.nfts.map((nft) => (
                  <div key={nft.label} className="min-w-0">
                    <span className="font-semibold">
                      {nft.label}: {formatBooostNumber(nft.count)}
                    </span>{" "}
                    <span className="font-normal whitespace-nowrap">
                      (= {formatBooostNumber(nft.hppTotal)} HPP)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xl font-semibold leading-[1.2]">-</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 grid grid-cols-1 min-[900px]:grid-cols-[1fr_auto] gap-2 min-[900px]:gap-x-6">
        <div className="min-[900px]:col-start-1 min-[900px]:row-start-1">
          <div className="inline-flex items-center rounded-full bg-[#224F19] px-3 py-1 text-[#5DF23F] text-sm font-normal leading-[1] tracking-[0.8px]">
            Total Reward
          </div>
        </div>
        <div className="min-[900px]:col-start-1 min-[900px]:row-start-2">
          <span className="text-white font-bold text-3xl leading-[1.5] tracking-[0.8px]">
            {isRewardLoading ? "..." : rewardAmount ? formatTokenBalance(rewardAmount, 2) : "0"}
          </span>
          <span className="text-white text-xl leading-[1.5] tracking-[0.8px] ml-2">HPP tokens ready to claim.</span>
        </div>
        <div className="min-[900px]:col-start-2 min-[900px]:row-start-2 self-center justify-self-start min-[900px]:justify-self-end flex gap-3">
          <Button variant={isDisabled ? "black" : "white"} size="md" onClick={onClaim} disabled={isDisabled}>
            Claim
          </Button>
        </div>
      </div>
    </div>
  );
}

function getBooostHistoryStatusLabel(status?: string) {
  if ((status || "").toLowerCase() === "completed") {
    return "Claimed";
  }
  return status || "Completed";
}

export default function AirdropBooostDetailClient({ id }: { id: string }) {
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
  const [reward, setReward] = useState<{
    beneficiary: `0x${string}`;
    totalAmount: bigint;
    claimed: boolean;
    isActive: boolean;
  } | null>(null);
  const [claimableAmountRaw, setClaimableAmountRaw] = useState<bigint | null>(null);
  const [isVestingLoading, setIsVestingLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [successModal, setSuccessModal] = useState<null | { variant: "claim" | "claimAndStake"; amount: string }>(null);
  const [historyItems, setHistoryItems] = useState<
    Array<{ id: string; date: string; action: string; amount?: string; status?: string; isLocal?: boolean }>
  >([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [booostProfile, setBooostProfile] = useState<BooostProfileState>(EMPTY_BOOOST_PROFILE);
  const avatarRef = React.useRef<any>(null);

  // Get airdrop detail from Redux
  const airdropState = useAppSelector((state) => state.airdrop);
  const cachedDetail = airdropState.details[id];
  const isDetailLoading = airdropState.detailLoading[id] || false;

  // Convert Redux detail to AirdropDetail format
  const airdropDetail = useMemo(() => {
    if (!cachedDetail) return null;
    return {
      ...cachedDetail,
      icon: HPPTickerIcon,
    };
  }, [cachedDetail]);

  const heroImage = useMemo(() => getAirdropHeroImage(cachedDetail?.imageUrl), [cachedDetail?.imageUrl]);

  const faqItems = useMemo(() => getAirdropFaqForEvent(id), [id]);

  // HPP network public client
  const publicClient = useHppPublicClient();
  const { id: HPP_CHAIN_ID, chain: hppChain, rpcUrl } = useHppChain();
  const HPP_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_HPP_TOKEN_CONTRACT as `0x${string}`;
  const explorerBase = getHppExplorerBaseUrl();

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
      if (normalized !== "none") return fromDetail as `0x${string}`;
    }

    // Fallback: list payload (if it included contract/contractAddress)
    const fromEvents =
      airdropState.events.hpp?.find((e) => e.id === id)?.contract ??
      airdropState.events.dapp?.find((e) => e.id === id)?.contract ??
      airdropState.events.collaboration?.find((e) => e.id === id)?.contract;

    if (fromEvents) {
      const normalized = String(fromEvents).trim().toLowerCase();
      if (normalized !== "none") return fromEvents as `0x${string}`;
    }

    return "" as `0x${string}`;
  }, [cachedDetail?.contract, airdropState.events, id]);

  // Fetch reward + claimable from Booost reward contract (one-shot claim)
  const fetchReward = React.useCallback(async () => {
    if (!isConnected || !address || !contractAddress) {
      setReward(null);
      setClaimableAmountRaw(null);
      setIsVestingLoading(false);
      return;
    }

    try {
      setIsVestingLoading(true);
      const [rewardResult, claimableResult] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: hppPartyKnightsRewardABI,
          functionName: "getReward",
          args: [address],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: hppPartyKnightsRewardABI,
          functionName: "getClaimableAmount",
          args: [address],
        }),
      ]);

      const r = rewardResult as unknown as {
        beneficiary?: `0x${string}`;
        totalAmount?: bigint;
        claimed?: boolean;
        isActive?: boolean;
        0?: `0x${string}`;
        1?: bigint;
        2?: boolean;
        3?: boolean;
      };
      setReward({
        beneficiary: (r.beneficiary ?? r[0]) as `0x${string}`,
        totalAmount: (r.totalAmount ?? r[1] ?? BigInt(0)) as bigint,
        claimed: !!(r.claimed ?? r[2]),
        isActive: !!(r.isActive ?? r[3]),
      });
      setClaimableAmountRaw(claimableResult as unknown as bigint);
    } catch (error) {
      console.error("Failed to fetch Booost reward:", error);
      setReward(null);
      setClaimableAmountRaw(null);
    } finally {
      setIsVestingLoading(false);
    }
  }, [isConnected, address, contractAddress, publicClient]);

  useEffect(() => {
    fetchReward();
  }, [fetchReward]);

  // Normalize on-chain reward for UI (one-shot claim — no vesting schedule)
  const vestingData = useMemo(() => {
    if (!reward) return null;

    const totalAmountSafe = typeof reward.totalAmount === "bigint" ? reward.totalAmount : BigInt(0);
    const claimedAmountSafe = reward.claimed ? totalAmountSafe : BigInt(0);
    const claimableSafe = typeof claimableAmountRaw === "bigint" ? claimableAmountRaw : BigInt(0);

    return {
      beneficiary: reward.beneficiary,
      totalAmount: formatUnits(totalAmountSafe, 18),
      claimedAmount: formatUnits(claimedAmountSafe, 18),
      claimableAmount: formatUnits(claimableSafe, 18),
      vestedAmount: formatUnits(claimedAmountSafe + claimableSafe, 18),
      notVestedAmount: "0",
      isActive: reward.isActive,
      claimed: reward.claimed,
    };
  }, [reward, claimableAmountRaw]);

  const claimableAmount = useMemo(() => vestingData?.claimableAmount ?? null, [vestingData]);

  const isEligible = Boolean(vestingData?.isActive || booostProfile.isEligible);
  const isProfileLoading = isVestingLoading || booostProfile.loading;

  // Fetch Booost eligibility + Username / BYL / NFT / reward by wallet
  useEffect(() => {
    let cancelled = false;

    const fetchBooostProfile = async () => {
      if (!isConnected || !address) {
        if (!cancelled) setBooostProfile(EMPTY_BOOOST_PROFILE);
        return;
      }

      const baseUrl = getAirdropAdminApiBaseUrl(id);
      if (!baseUrl) {
        if (!cancelled) setBooostProfile({ ...EMPTY_BOOOST_PROFILE, loading: false });
        return;
      }

      if (!cancelled) {
        setBooostProfile((prev) => ({ ...prev, loading: true }));
      }

      try {
        const ratesPromise = axios
          .get(`${baseUrl}/api/airdrop/rates`, { headers: { accept: "application/json" } })
          .then((resp) => parseBooostNftRates(resp?.data?.data))
          .catch((err) => {
            console.error("Failed to fetch Booost airdrop rates:", err);
            return null;
          });

        let profileData: Record<string, unknown> | null = null;
        try {
          const profileResp = await axios.get(
            `${baseUrl}/api/airdrop?walletAddress=${encodeURIComponent(address)}`,
            { headers: { accept: "application/json" } },
          );
          const data = profileResp?.data?.data;
          if (data && typeof data === "object") {
            profileData = data as Record<string, unknown>;
          }
        } catch (err) {
          // 404 = wallet not in airdrop list (not eligible). Treat as empty profile, not a hard failure.
          const status = axios.isAxiosError(err) ? err.response?.status ?? err.status : undefined;
          if (status !== 404) {
            console.error("Failed to fetch Booost airdrop eligibility:", err);
          }
          profileData = null;
        }

        const rates = await ratesPromise;

        if (!cancelled) {
          if (profileData) {
            setBooostProfile(mapBooostApiRow(profileData, rates));
          } else {
            setBooostProfile({
              ...EMPTY_BOOOST_PROFILE,
              isBooostUser: false,
              loading: false,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch Booost airdrop eligibility:", err);
        if (!cancelled) {
          setBooostProfile({
            ...EMPTY_BOOOST_PROFILE,
            isBooostUser: false,
            loading: false,
          });
        }
      }
    };

    void fetchBooostProfile();

    return () => {
      cancelled = true;
    };
  }, [isConnected, address, id]);

  const fetchAirdropHistory = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isConnected || !address || !contractAddress) {
        setHistoryItems([]);
        setIsHistoryLoading(false);
        return;
      }
      const lambdaBase = process.env.NEXT_PUBLIC_HPP_BLOCKSCOUT_PROXY_URL;
      if (!lambdaBase) {
        console.error("NEXT_PUBLIC_HPP_BLOCKSCOUT_PROXY_URL is not defined");
        setIsHistoryLoading(false);
        return;
      }
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 2000;
      const isMainnet = HPP_CHAIN_ID === 190415;
      const network = isMainnet ? "mainnet" : "sepolia";
      const baseUrl = `${lambdaBase}/blockscout/${network}/api/v2/addresses/${contractAddress}/transactions`;

      const isInternalServerError = (err: any): boolean => {
        return (
          err?.response?.status === 500 ||
          err?.response?.data?.message === "Internal Server Error" ||
          err?.message?.includes("Internal Server Error")
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
          const resp = await retryApiCall(() => axios.get(nextUrl!, { headers: { accept: "application/json" } }));
          const pageItems: any[] = resp?.data?.items ?? [];
          if (Array.isArray(pageItems) && pageItems.length > 0) items.push(...pageItems);
          const np = resp?.data?.next_page_params;
          if (!np || pageItems.length === 0) {
            nextUrl = null;
            break;
          }
          const qs = new URLSearchParams();
          if (np.index !== undefined) qs.set("index", String(np.index));
          if (np.value !== undefined) qs.set("value", String(np.value));
          if (np.hash !== undefined) qs.set("hash", String(np.hash));
          if (np.inserted_at !== undefined) qs.set("inserted_at", String(np.inserted_at));
          if (np.block_number !== undefined) qs.set("block_number", String(np.block_number));
          if (np.fee !== undefined) qs.set("fee", String(np.fee));
          if (np.items_count !== undefined) qs.set("items_count", String(np.items_count));
          nextUrl = `${baseUrl}?${qs.toString()}`;
          guard += 1;
        }

        const walletLc = address.toLowerCase();
        const normalizeMethod = (raw: any) =>
          String(raw || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "");
        // For now, only show Claim history. (Future: add "Claim + Staking" etc. here.)
        const allowedMethods = new Set(["claim", "claimtokens", "claimandstake"]);
        const mapStatus = (it: any): string => {
          const res = String(it?.result || "").toLowerCase();
          const ok = String(it?.status || "").toLowerCase() === "ok";
          const hasRevert = !!it?.revert_reason;
          return hasRevert || res === "failed" ? "Rejected" : ok && res === "success" ? "Completed" : "Pending";
        };
        let mapped = Array.isArray(items)
          ? items
              .filter((it: any) => String(it?.from?.hash || "").toLowerCase() === walletLc)
              .filter((it: any) => {
                const method = normalizeMethod(
                  it?.method || it?.decoded_input?.method_call || it?.decoded_input?.method,
                );
                return allowedMethods.has(method);
              })
              .map((it: any) => {
                const method = normalizeMethod(
                  it?.method || it?.decoded_input?.method_call || it?.decoded_input?.method,
                );
                const action = method === "claimandstake" ? "Claim + Stake" : "Claim";
                return {
                  id: String(it.hash),
                  date: dayjs(new Date(String(it.timestamp)).getTime()).format("YYYY-MM-DD HH:mm"),
                  action,
                  amount: undefined as string | undefined,
                  status: mapStatus(it),
                  isLocal: false,
                };
              })
              .sort((a: any, b: any) => {
                const dateA = new Date(a.date.replace(" ", "T")).getTime();
                const dateB = new Date(b.date.replace(" ", "T")).getTime();
                return dateB - dateA;
              })
          : [];

        // Backfill claimed amount from token transfers by tx hash (HPP token -> wallet, from contract)
        try {
          const needAmount = mapped.filter((m: any) => !m.amount);
          const tokenAddr = (process.env.NEXT_PUBLIC_HPP_TOKEN_CONTRACT || "").toLowerCase();
          const contractLc = String(contractAddress).toLowerCase();
          const stakingLc = String(process.env.NEXT_PUBLIC_HPP_STAKING_CONTRACT || "").toLowerCase();
          if (needAmount.length > 0 && tokenAddr) {
            const addrTUrl = `${lambdaBase}/blockscout/${network}/api/v2/addresses/${address}/token-transfers?type=`;
            const addrTResp = await retryApiCall(() =>
              axios.get(addrTUrl, { headers: { accept: "application/json" } }),
            );
            const addrTItems: any[] = addrTResp?.data?.items ?? [];
            if (Array.isArray(addrTItems) && addrTItems.length > 0) {
              const byHashQuick = new Map<string, string>();
              for (const tr of addrTItems) {
                const tokenLc = String(tr?.token?.address_hash || "").toLowerCase();
                if (tokenLc !== tokenAddr) continue;
                const toLc = String(tr?.to?.hash || "").toLowerCase();
                const fromLc = String(tr?.from?.hash || "").toLowerCase();
                if (toLc !== walletLc) continue;
                if (fromLc && fromLc !== contractLc) continue; // prefer contract->wallet transfers
                const txHash = String(tr?.transaction_hash || tr?.tx_hash || tr?.hash || "");
                if (!txHash) continue;
                const dec =
                  Number(tr?.token?.decimals) || Number(tr?.total?.decimals) || Number(tr?.token_decimals) || 18;
                const raw = String(tr?.total?.value ?? tr?.value ?? tr?.amount ?? "0");
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
          const tokenAddr = (process.env.NEXT_PUBLIC_HPP_TOKEN_CONTRACT || "").toLowerCase();
          const contractLc = String(contractAddress).toLowerCase();
          const stakingLc = String(process.env.NEXT_PUBLIC_HPP_STAKING_CONTRACT || "").toLowerCase();
          if (need.length > 0 && tokenAddr) {
            for (const m of need) {
              try {
                const url = `${lambdaBase}/blockscout/${network}/api/v2/transactions/${m.id}/token-transfers`;
                const resp = await retryApiCall(() => axios.get(url, { headers: { accept: "application/json" } }));
                const tItems: any[] = resp?.data?.items ?? [];
                if (!Array.isArray(tItems) || tItems.length === 0) continue;
                // pick the HPP transfer that originated from this airdrop contract and went to wallet or staking
                const tr = tItems.find((x: any) => {
                  const tokenLc = String(x?.token?.address_hash || "").toLowerCase();
                  if (tokenLc !== tokenAddr) return false;
                  const fromLc = String(x?.from?.hash || "").toLowerCase();
                  const toLc = String(x?.to?.hash || "").toLowerCase();
                  if (fromLc && fromLc !== contractLc) return false;
                  return toLc === walletLc || (stakingLc ? toLc === stakingLc : false);
                });
                if (!tr) continue;
                const dec =
                  Number(tr?.token?.decimals) || Number(tr?.total?.decimals) || Number(tr?.token_decimals) || 18;
                const raw = String(tr?.total?.value ?? tr?.value ?? tr?.amount ?? "0");
                const units = formatUnits(BigInt(raw), Number.isFinite(dec) ? dec : 18);
                const display = `${formatTokenBalance(units, 2)} HPP`;
                mapped = mapped.map((x: any) =>
                  String(x.id).toLowerCase() === String(m.id).toLowerCase() ? { ...x, amount: display } : x,
                );
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
            const dateA = new Date(String(a.date || "").replace(" ", "T")).getTime();
            const dateB = new Date(String(b.date || "").replace(" ", "T")).getTime();
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
    },
    [isConnected, address, contractAddress, HPP_CHAIN_ID, historyItems.length],
  );

  // Fetch on-chain history when wallet or contract changes
  useEffect(() => {
    fetchAirdropHistory();
  }, [fetchAirdropHistory]);

  // Poll for history when there are local pending items (same as staking Activity Log)
  useEffect(() => {
    const localPending = historyItems.filter((h) => h.isLocal && h.status === "Pending");
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
        open({ view: "Connect" });
        return;
      }
      if (!contractAddress) {
        showToast("Error", "Contract address is not available yet.", "error");
        return;
      }
      if (!claimableAmount || new Big(claimableAmount).lte(0)) return;

      // Make sure wallet is on HPP network
      try {
        await ensureHppChain();
      } catch {
        showToast("Switch network", "Please switch to HPP Network in your wallet and try again.", "error");
        return;
      }

      const hppWalletClient =
        walletClient ?? (await getWalletClient(wagmiConfig, { account: address, chainId: HPP_CHAIN_ID }));

      setIsClaiming(true);
      showToast("Waiting for claim...", "Please confirm in your wallet.", "loading");

      const txHash = await hppWalletClient.writeContract({
        address: contractAddress,
        abi: hppPartyKnightsRewardABI,
        functionName: "claim",
        args: [],
        account: address as `0x${string}`,
        chain: hppChain,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt.status === "success") {
        hideToast();
        const amountNumeric = claimableAmount ? formatTokenBalance(claimableAmount, 2) : "0.00";
        setSuccessModal({ variant: "claim", amount: amountNumeric });
        // Add local history immediately (Pending until indexed by Blockscout)
        const amountDisplay = claimableAmount ? `${formatTokenBalance(claimableAmount, 2)} HPP` : undefined;
        setHistoryItems((prev) => {
          const exists = prev.some((a) => String(a.id).toLowerCase() === String(txHash).toLowerCase());
          if (exists) return prev;
          return [
            {
              id: String(txHash),
              date: dayjs().format("YYYY-MM-DD HH:mm"),
              action: "Claim",
              amount: amountDisplay,
              status: "Pending",
              isLocal: true,
            },
            ...prev,
          ];
        });
        // Refresh on-chain amounts
        await fetchReward();
        // Give Blockscout a moment to index, then refresh without flashing loader
        setTimeout(() => fetchAirdropHistory({ silent: true }), 2000);
      } else {
        showToast("Claim failed", "Transaction was rejected or failed.", "error");
      }
    } catch (_e) {
      showToast("Error", "Failed to process claim request.", "error");
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
    fetchReward,
    fetchAirdropHistory,
    showToast,
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
    [historyItems?.length],
  );

  // Computed values
  const shortAddress = useMemo(() => {
    if (!address) return "";
    return `${address.slice(0, 11)}...${address.slice(-9)}`;
  }, [address]);

  // Set avatar address
  useEffect(() => {
    if (avatarRef.current && address) {
      avatarRef.current.address = address;
      avatarRef.current.setAttribute("address", address);
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
        </a>,
      );
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  // TEMP(airdrop-static-ui): load Booost detail from static config (always refresh from source)
  useEffect(() => {
    if (!id) return;

    dispatch(setAirdropDetailLoading({ id, loading: true }));
    setError(null);

    const detail = getStaticAirdropDetailById(id);
    if (detail) {
      dispatch(setAirdropDetail({ id, detail }));
    } else {
      setError("Airdrop not found");
      dispatch(setAirdropDetailLoading({ id, loading: false }));
    }
  }, [id, dispatch]);

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
            sidebarOpen ? "opacity-50 min-[1200px]:opacity-100" : ""
          }`}
        >
          {/* Go Back Button */}
          <div className="ml-4 max-w-6xl mx-auto my-4">
            <Button
              size="sm"
              onClick={() => router.push("/airdrop")}
              className="flex items-center space-x-1 cursor-pointer !bg-[#121212] text-white rounded-[5px]"
            >
              <svg className="w-4 h-4 text-[#FFFFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7 7-7" />
              </svg>
              {"Go Back"}
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
                  <div className="h-[400px] w-[400px] overflow-hidden rounded-[5px]">
                    {heroImage ? (
                      <Image
                        src={heroImage}
                        alt={airdropDetail.name}
                        width={400}
                        height={400}
                        className="h-full w-full object-cover"
                        priority
                      />
                    ) : (
                      <video
                        src="/videos/Airdrop.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                </div>

                {/* Left Side - Text Content */}
                <div className="mt-6 min-[1200px]:mt-0 flex flex-col items-center text-center min-[1200px]:order-1 min-[1200px]:items-start min-[1200px]:text-left">
                  {/* Status Tag */}
                  <div
                    className="inline-block px-2.5 py-1 rounded-[5px] mb-2.5 text-base font-semibold text-black"
                    style={{
                      backgroundColor:
                        airdropDetail.status === "On-Going"
                          ? "#5DF23F"
                          : airdropDetail.status === "Coming Soon"
                            ? "#F7EA94"
                            : "#BFBFBF",
                    }}
                  >
                    {airdropDetail.status}
                  </div>
                  <h1 className="text-[50px] leading-[1.5] font-[900] text-white">{airdropDetail.name}</h1>
                  <div className="space-y-6 text-white text-base leading-[1.5] mb-5">
                    <p className="text-[#bfbfbf] text-base">{parseMarkdownLinks(airdropDetail.description)}</p>
                    <div className="space-y-1">
                      <p className="text-[#bfbfbf] text-base">
                        Claim Period:{" "}
                        <span className="text-white text-base">
                          {airdropDetail.claimPeriodStart} ~ {airdropDetail.claimPeriodEnd}
                        </span>
                      </p>
                    </div>
                    {!isConnected && <p className="text-[#bfbfbf] text-base">{airdropDetail.eligibilityDescription}</p>}
                  </div>
                  {isConnected ? (
                    <></>
                  ) : (
                    <Button
                      variant="white"
                      size="md"
                      onClick={() => open({ view: "Connect" })}
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
                      {React.createElement("wui-avatar", { ref: avatarRef, address })}
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
              {isProfileLoading ? (
                <div className="flex items-center gap-2 mb-5">
                  <DotLottieReact src="/lotties/Loading.lottie" autoplay loop style={{ width: 24, height: 24 }} />
                </div>
              ) : isEligible ? (
                <div className="mb-5">
                  <h2 className="text-[50px] font-[600] text-white leading-[1]">You are eligible.</h2>
                  <BooostClaimPeriodBadge start={airdropDetail.claimPeriodStart} end={airdropDetail.claimPeriodEnd} />
                </div>
              ) : (
                <h2 className="text-[50px] font-[600] text-white leading-[1] mb-5">Sorry, you are not eligible.</h2>
              )}

              {/* Overview / Booost Card */}
              <BooostOverviewCard
                isVestingLoading={isVestingLoading}
                claimableAmount={claimableAmount}
                isClaiming={isClaiming}
                onClaim={() => void onClaimTokens()}
                profile={booostProfile}
              />

              {/* Success Modal (Claim) */}
              {successModal && (
                <div
                  className="fixed inset-0 z-[60] flex items-center justify-center px-4 backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
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

                    {successModal.variant === "claim" ? (
                      <>
                        <div className="text-white text-[64px] leading-[1] font-[900] mb-6">Congrats!</div>
                        <div className="text-[#5DF23F] text-xl font-semibold leading-[1.2] tracking-[0.8px] mb-6">
                          {successModal.amount} HPP claimed!
                        </div>
                        <div className="text-white text-base leading-[1.5] tracking-[0.8px] mb-10">
                          Your rewards don&apos;t stop here. Stake your airdrop and earn up to 39% APR.
                        </div>
                        <Button
                          variant="green"
                          size="md"
                          fullWidth
                          className="!rounded-full"
                          onClick={() => {
                            setSuccessModal(null);
                            router.push("/staking");
                          }}
                        >
                          Go to HPP Staking
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-white text-[64px] leading-[1] font-[900] mb-6">You&apos;re in!</div>
                        <div className="text-[#5DF23F] text-xl font-semibold leading-[1.2] tracking-[0.8px] mb-6">
                          {successModal.amount} HPP claimed and staked!
                        </div>
                        <div className="text-white text-base leading-[1.5] tracking-[0.8px] mb-10">
                          Stake early, stake more, and maximize your rewards with up to 39% APR.
                        </div>
                        <Button
                          variant="green"
                          size="md"
                          fullWidth
                          className="!rounded-full"
                          onClick={() => {
                            setSuccessModal(null);
                            router.push("/staking");
                          }}
                        >
                          Go to HPP Staking
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* History Section - show by default when wallet is connected */}
              {isConnected && (
                <div className="mb-25">
                  <div className="text-white text-base font-semibold leading-[1.2] tracking-[0.8px] mb-2.5">
                    History
                  </div>
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
                                    <div className="text-[#bfbfbf] text-base leading-[1.2] tracking-[0.8px]">
                                      {tx.date}
                                    </div>
                                    <div className="mt-2.5 text-[#5DF23F] text-base leading-[1.2] tracking-[0.8px] font-normal">
                                      {tx.action}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2 text-white text-sm leading-[1.2] tracking-[0.8px]">
                                      <span>
                                        {tx.status === "Pending" ? (
                                          <span className="pending-text">Pending</span>
                                        ) : (
                                          <span
                                            className={
                                              getBooostHistoryStatusLabel(tx.status) === "Claimed"
                                                ? "text-[#5DF23F]"
                                                : ""
                                            }
                                          >
                                            {getBooostHistoryStatusLabel(tx.status)}
                                          </span>
                                        )}
                                      </span>
                                      <a
                                        href={`${explorerBase}/tx/${tx.id}`}
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
                                    <div className="text-white text-base leading-[1.2] tracking-[0.8px] font-normal">
                                      {tx.amount || "-"}
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
                                              aria-current={active ? "page" : undefined}
                                              className={[
                                                "cursor-pointer flex items-center justify-center rounded-full",
                                                "w-6 h-6 text-base leading-[1] tracking-[0]",
                                                active ? "bg-white text-black" : "text-[#BFBFBF] hover:text-white",
                                              ].join(" ")}
                                              onClick={() => setHistoryPage(n)}
                                            >
                                              {n}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <div className="flex min-[640px]:hidden items-center gap-4.5">
                                        {pages.map((page, idx) => {
                                          if (typeof page === "string") {
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
                                              aria-current={active ? "page" : undefined}
                                              className={[
                                                "cursor-pointer flex items-center justify-center rounded-full",
                                                "w-6 h-6 text-base leading-[1] tracking-[0]",
                                                active ? "bg-white text-black" : "text-[#BFBFBF] hover:text-white",
                                              ].join(" ")}
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
              )}
            </div>
          )}

          {/* FAQ Section */}
          <div className="px-5 max-w-6xl mx-auto mt-7.5 mb-20">
            <FaqSection items={faqItems} />
          </div>

          {/* Don't Miss the Next Airdrop Section */}
          <DontMissAirdrop />

          <Footer />
        </main>
      </div>
    </div>
  );
}
