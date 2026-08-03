/**
 * HPP Agora Workers API — proposal list for Governance UI.
 * @see Workers API (GET /proposals)
 */

export interface AgoraProposal {
  id: number;
  contentHash: string;
  title: string;
  body: string;
  author: string;
  startTime: number;
  endTime: number;
  snapshotBlock: number;
  quorum: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  status: 'pending' | 'active' | 'passed' | 'failed' | 'cancelled';
  cancelled: boolean;
  displayId?: number;
  hidden?: boolean;
  voteCount?: number;
  createdAt: number;
}

export interface AgoraProposalsResponse {
  proposals: AgoraProposal[];
}

const AGORA_API_MAINNET_DEFAULT = 'https://agora-api.hpp.io';
const AGORA_API_SEPOLIA_DEFAULT = 'https://agora-sepolia-api.hpp.io';
const AGORA_WEB_MAINNET_DEFAULT = 'https://agora.hpp.io';
const AGORA_WEB_SEPOLIA_DEFAULT = 'https://agora-sepolia.hpp.io';

/** True if URL clearly targets the Sepolia Agora deployment (vs mainnet). */
function agoraApiUrlLooksSepolia(url: string): boolean {
  return /agora-sepolia-api\.|sepolia-api\.hpp\.io/i.test(url);
}

function agoraWebUrlLooksSepolia(url: string): boolean {
  return /agora-sepolia\.hpp\.io/i.test(url);
}

/**
 * Picks Agora Workers API origin for the given HPP chain.
 * If `NEXT_PUBLIC_HPP_AGORA_API_URL` points at the *other* network than `chainId`, it is ignored so
 * local Sepolia builds are not forced to the production mainnet API (empty proposals) by mistake.
 */
export function getAgoraApiBase(chainId: number): string {
  const isMainnet = chainId === 190415;
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_HPP_AGORA_API_URL?.trim().replace(/\/$/, '') : undefined;

  if (fromEnv) {
    const envSepolia = agoraApiUrlLooksSepolia(fromEnv);
    if (isMainnet !== envSepolia) {
      return isMainnet ? AGORA_API_MAINNET_DEFAULT : AGORA_API_SEPOLIA_DEFAULT;
    }
    return fromEnv;
  }

  return isMainnet ? AGORA_API_MAINNET_DEFAULT : AGORA_API_SEPOLIA_DEFAULT;
}

/** Public Agora web app — proposal detail links */
export function getAgoraWebBase(chainId: number): string {
  const isMainnet = chainId === 190415;
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_HPP_AGORA_WEB_URL?.trim().replace(/\/$/, '') : undefined;

  if (fromEnv) {
    const envSepolia = agoraWebUrlLooksSepolia(fromEnv);
    if (isMainnet !== envSepolia) {
      return isMainnet ? AGORA_WEB_MAINNET_DEFAULT : AGORA_WEB_SEPOLIA_DEFAULT;
    }
    return fromEnv;
  }

  return isMainnet ? AGORA_WEB_MAINNET_DEFAULT : AGORA_WEB_SEPOLIA_DEFAULT;
}

export function proposalDetailHref(webBase: string, proposalId: number): string {
  const base = webBase.replace(/\/$/, '');
  return `${base}/proposal/${proposalId}`;
}

export async function fetchAgoraProposals(apiBase: string, init?: RequestInit): Promise<AgoraProposal[]> {
  const url = `${apiBase.replace(/\/$/, '')}/proposals`;
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      ...(init?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Agora proposals failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as AgoraProposalsResponse & { data?: { proposals?: AgoraProposal[] } };
  if (Array.isArray(data.proposals)) return data.proposals;
  if (Array.isArray(data.data?.proposals)) return data.data.proposals;
  return [];
}

/** Resolve relative upload paths against API origin */
export function resolveAgoraAssetUrl(apiBase: string, urlOrPath: string): string {
  const t = urlOrPath.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  try {
    return new URL(t.startsWith('/') ? t : `/${t}`, apiBase.replace(/\/$/, '/') + '/').href;
  } catch {
    return t;
  }
}

const IMG_IN_MD = /!\[[^\]]*\]\(([^)\s]+)\)/;

export function firstMarkdownImageUrl(body: string): string | null {
  const m = body.match(IMG_IN_MD);
  return m?.[1]?.trim() ?? null;
}

export function excerptFromMarkdownBody(body: string, maxLen = 180): string {
  let t = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(IMG_IN_MD, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > maxLen) t = t.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
  return t || '—';
}

export function formatProposalStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    active: 'Active',
    passed: 'Passed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build an on-the-fly default cover image for proposals with no image.
 * Uses a data URL SVG so no backend/image asset is required.
 */
export function makeHipFallbackImageDataUrl(
  proposalId: number,
  labelPrefix = 'HIP',
  subtitle = 'HPP Improvement Proposal',
  accentColor = '#5651d8',
): string {
  const label = `${labelPrefix}-${proposalId}`;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#121212"/>
      <stop offset="100%" stop-color="#1A1A1A"/>
    </linearGradient>
    <radialGradient id="accent" cx="0.2" cy="0.1" r="1">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)"/>
  <rect width="800" height="450" fill="url(#accent)"/>
  <rect x="36" y="36" rx="10" ry="10" width="728" height="378" fill="none" stroke="#2a2a2a" stroke-width="2"/>
  <text x="400" y="218" text-anchor="middle" fill="#ffffff"
    font-family="'Pretendard Variable','Pretendard',system-ui,-apple-system,'Segoe UI',sans-serif"
    font-size="72" font-weight="800" letter-spacing="1">${label}</text>
  <text x="400" y="268" text-anchor="middle" fill="#bfbfbf"
    font-family="'Pretendard Variable','Pretendard',system-ui,-apple-system,'Segoe UI',sans-serif"
    font-size="24" font-weight="500">${subtitle}</text>
</svg>`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
