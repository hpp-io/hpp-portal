import type { AirdropEventData, AirdropDetailData, AirdropType } from "@/store/slices";
import type { FaqItem } from "@/components/ui/Faq";
import { airdropData, airdropSharedFaq } from "@/static/uiData";

type StaticAirdropEventConfig = AirdropEventData & {
  /** Campaign-specific eligibility copy for FAQ #2 (shared template for items 1, 3–5). */
  faqEligibilityAnswer?: string;
  /** Optional override for FAQ #5 (check claimed tokens). */
  faqCheckClaimedAnswer?: string;
  /** FAQ campaign label in questions #2–3; defaults to `name`. */
  faqCampaignName?: string;
  /** Party Knights ranking API base (preview vs prod by chain). */
  adminApiBaseUrl?: string;
};

const isSepoliaChain = () => (process.env.NEXT_PUBLIC_CHAIN || "mainnet").toLowerCase() === "sepolia";

function buildCampaignAirdropFaq(params: {
  campaignName: string;
  eligibilityAnswer: string;
  claimPeriodStart: string;
  claimPeriodEnd: string;
  checkClaimedAnswer?: string;
}): FaqItem[] {
  return [
    airdropSharedFaq.hppToken,
    {
      id: 2,
      question: `Who is eligible to claim the ${params.campaignName}?`,
      answer: params.eligibilityAnswer,
    },
    {
      id: 3,
      question: `What is the deadline to claim the ${params.campaignName}?`,
      answer: `Airdrop claims will be available from ${params.claimPeriodStart} to ${params.claimPeriodEnd}. The claim window ensures that all eligible participants have sufficient time to receive their allocation.`,
    },
    airdropSharedFaq.maximizeRewards,
    params.checkClaimedAnswer
      ? { id: 5, question: airdropSharedFaq.checkClaimed.question, answer: params.checkClaimedAnswer }
      : airdropSharedFaq.checkClaimed,
  ];
}

/** Legacy Genesis UUID from marketing — redirects to slug URL. */
export const GENESIS_AIRDROP_LEGACY_UUID = "8aa6defc-3303-4a8b-a4fd-7edf508c78e8";

/** Deprecated URL segments → canonical slug `id`. */
const AIRDROP_LEGACY_ROUTE_ALIASES: Record<string, string> = {
  [GENESIS_AIRDROP_LEGACY_UUID]: "hpp-genesis-airdrop",
  "a1b2c3d4-e5f6-4a8b-a4fd-7edf508c78e9": "hpp-party-knights-1",
};

/**
 * TEMP(airdrop-static-ui): Hardcoded airdrop catalog — replace with CMS/API when UI stabilizes.
 */
export const STATIC_AIRDROP_EVENTS: Record<AirdropType, StaticAirdropEventConfig[]> = {
  hpp: [
    {
      id: "hpp-genesis-airdrop",
      name: "HPP Genesis Airdrop",
      eventName: "HPP",
      reward: 17000000,
      starts: "2/23/26",
      ends: "2/23/27",
      status: "On-Going",
      icon: "HPPTickerIcon",
      description:
        "17,000,000 HPP tokens are being distributed to community members who participated in the [AIP-21 Governance Vote](https://x.com/aergo_io/status/1907719761439633597).",
      claimPeriodStart: "2026.2.23 08:00 UTC",
      claimPeriodEnd: "2027.2.23 08:00 UTC",
      vestingPeriodStart: "2025.12.1 UTC",
      vestingPeriodEnd: "2027.12.1 UTC",
      vestingDuration: "24 months",
      eligibilityDescription: "Connect your AIP-21 voting wallet to check airdrop eligibility.",
      contract: "0xe1a428Eb27cA90bc24f7f8c080BA2D0d090506f1",
    },
    {
      id: "hpp-party-knights-1",
      name: "HPP Party Knights #1",
      eventName: "HPP",
      reward: 35000,
      starts: "7/14/26",
      ends: "8/13/26",
      status: "On-Going",
      icon: "HPPTickerIcon",
      imageUrl: "PartyKnightsAirdrop",
      description:
        "According to the [Launch of the HPP Party Knights Ambassador Program](https://agora.hpp.io/proposal/12), 35,000 HPP tokens are being distributed to members who participated in the HPP Party Knights Ambassador Cohort 1.",
      claimPeriodStart: "2026.7.14, 09:00 UTC",
      claimPeriodEnd: "2026.8.13, 09:00 UTC",
      eligibilityDescription: "Connect your wallet to check airdrop eligibility.",
      contract: isSepoliaChain()
        ? "0x9825e557d0AB68DBb762c60E0284bDD354422575" // HPP Sepolia
        : "0x5735A5C7f8ef3207e9d927BbA503d23154C1bda8", // HPP Mainnet
      adminApiBaseUrl: isSepoliaChain()
        ? "https://partyknights-admin-preview.hpp.io"
        : "https://partyknights-admin-prod.hpp.io",
      faqCampaignName: "Party Knights Airdrop #1",
      faqEligibilityAnswer:
        "35,000 HPP tokens will be distributed to users who participated in the Party Knights Ambassador Program.",
    },
    {
      id: "hpp-booost-1",
      name: "Booost Airdrop #1",
      eventName: "DApp",
      reward: 12750000,
      starts: "8/10/26",
      ends: "12/31/26",
      status: "On-Going",
      icon: "BooostCircleIcon",
      imageUrl: "BooostAirdrop",
      description:
        "HPP tokens are being distributed to members who participated in Booost in-app activities and holding Booost NFTs. [Booost.live](https://www.booost.live)",
      claimPeriodStart: "2026.8.10, 09:00 UTC",
      claimPeriodEnd: "2026.12.31, 09:00 UTC",
      eligibilityDescription: "Connect your Booost wallet to check airdrop eligibility.",
      contract: isSepoliaChain()
        ? "0xDFD751E793609429ecD43C5D160Cd15e0fd1C929" // HPP Sepolia
        : "0x3F35F750D6B5F4f79bF90Efba085A9553F5dDDc7", // HPP Mainnet
      adminApiBaseUrl: "https://portal-api.hpp.io",
      faqCampaignName: "Booost Airdrop",
      faqEligibilityAnswer:
        "12,750,000 HPP tokens will be distributed to members who participated in Booost in-app activities and holding Booost NFTs.([Booost Airdrop Guide](https://www.booost.live/airdrop-guide))",
    },
  ],
  dapp: [],
  collaboration: [],
};

export function getStaticAirdropEvents(type: AirdropType): AirdropEventData[] {
  return STATIC_AIRDROP_EVENTS[type] ?? [];
}

export function getStaticAirdropById(id: string): AirdropEventData | null {
  for (const type of ["hpp", "dapp", "collaboration"] as const) {
    const found = STATIC_AIRDROP_EVENTS[type].find((e) => e.id === id);
    if (found) return found;
  }
  return null;
}

export function resolveAirdropCanonicalId(routeParam: string): string | null {
  const normalized = routeParam.trim();
  if (!normalized) return null;
  const candidate = AIRDROP_LEGACY_ROUTE_ALIASES[normalized] ?? normalized;
  return getStaticAirdropById(candidate)?.id ?? null;
}

export function getStaticAirdropByRouteParam(routeParam: string): StaticAirdropEventConfig | null {
  const canonicalId = resolveAirdropCanonicalId(routeParam);
  if (!canonicalId) return null;
  return getStaticAirdropById(canonicalId) as StaticAirdropEventConfig | null;
}

export function getAirdropPath(event: Pick<AirdropEventData, "id">): string {
  return `/airdrop/${event.id}/`;
}

export function isLegacyAirdropRoute(routeParam: string, event: Pick<AirdropEventData, "id">): boolean {
  return routeParam.trim() !== event.id;
}

export function staticAirdropEventToDetail(event: AirdropEventData): AirdropDetailData {
  return {
    id: event.id,
    name: event.name,
    eventName: event.eventName,
    reward: event.reward,
    starts: event.starts,
    ends: event.ends,
    status: event.status,
    description: event.description ?? "",
    claimPeriodStart: event.claimPeriodStart ?? event.starts ?? "-",
    claimPeriodEnd: event.claimPeriodEnd ?? event.ends ?? "-",
    vestingPeriodStart: event.vestingPeriodStart ?? "-",
    vestingPeriodEnd: event.vestingPeriodEnd ?? "-",
    vestingDuration: event.vestingDuration ?? "-",
    eligibilityDescription: event.eligibilityDescription ?? "",
    governanceVoteLink: event.governanceVoteLink,
    governanceVoteText: event.governanceVoteText,
    imageUrl: event.imageUrl,
    contract: event.contract,
  };
}

export function getStaticAirdropDetailById(id: string): AirdropDetailData | null {
  const event = getStaticAirdropById(id);
  return event ? staticAirdropEventToDetail(event) : null;
}

export function getAllStaticAirdropIds(): string[] {
  return (["hpp", "dapp", "collaboration"] as const).flatMap((type) => STATIC_AIRDROP_EVENTS[type].map((e) => e.id));
}

/** Route segments for `generateStaticParams` (canonical slugs + legacy UUIDs for static export). */
export function getAllStaticAirdropRouteParams(): string[] {
  const canonical = getAllStaticAirdropIds();
  const legacy = Object.keys(AIRDROP_LEGACY_ROUTE_ALIASES);
  return [...new Set([...canonical, ...legacy])];
}

/** Event-specific FAQ when defined in config; otherwise default airdrop page FAQ. */
export function getAirdropFaqForEvent(id: string): FaqItem[] {
  const event = getStaticAirdropById(id) as StaticAirdropEventConfig | null;
  if (!event) return airdropData.faq;

  if (event.faqEligibilityAnswer) {
    return buildCampaignAirdropFaq({
      campaignName: event.faqCampaignName ?? event.name,
      eligibilityAnswer: event.faqEligibilityAnswer,
      claimPeriodStart: event.claimPeriodStart ?? event.starts ?? "-",
      claimPeriodEnd: event.claimPeriodEnd ?? event.ends ?? "-",
      checkClaimedAnswer: event.faqCheckClaimedAnswer,
    });
  }

  return airdropData.faq;
}

/** Party Knights (and similar) admin API base URL from static airdrop config. */
export function getAirdropAdminApiBaseUrl(id: string): string | null {
  const event = getStaticAirdropById(id) as StaticAirdropEventConfig | null;
  return event?.adminApiBaseUrl?.trim() || null;
}
