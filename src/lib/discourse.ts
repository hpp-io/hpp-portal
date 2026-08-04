/**
 * Discourse API helpers for Governance "Discussion" feed.
 */

export interface DiscourseTopic {
  id: number;
  title: string;
  slug: string;
  created_at?: string;
  excerpt?: string;
  /** Present on many Discourse API responses; merged into `excerpt` when normalizing. */
  excerpt_text?: string;
  image_url?: string | null;
}

interface DiscourseCategoryResponse {
  topic_list?: {
    topics?: DiscourseTopic[];
  };
}

export function getDiscourseBase(): string {
  const fromEnv = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_HPP_DISCOURSE_BASE_URL : undefined;
  return (fromEnv?.trim() || 'https://forum.hpp.io').replace(/\/$/, '');
}

/**
 * Proxy URL is required (no direct client fetch fallback).
 */
export function getDiscourseProxyUrl(): string {
  const fromEnv = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_HPP_DISCOURSE_PROXY_URL : undefined;
  if (!fromEnv?.trim()) throw new Error('NEXT_PUBLIC_HPP_DISCOURSE_PROXY_URL is required');
  return fromEnv.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parses Discourse rate_limit JSON (or Lambda-wrapped body) for wait hint. */
function parseRateLimitWaitMs(errorBody: string): number {
  const tryParse = (raw: string): number | null => {
    try {
      const j = JSON.parse(raw) as { extras?: { wait_seconds?: number } };
      const s = j.extras?.wait_seconds;
      if (typeof s === 'number' && s >= 0) return Math.min(Math.ceil(s + 1) * 1000, 60_000);
    } catch {
      /* ignore */
    }
    return null;
  };

  const direct = tryParse(errorBody.trim());
  if (direct != null) return direct;

  const brace = errorBody.indexOf('{');
  if (brace >= 0) {
    const nested = tryParse(errorBody.slice(brace));
    if (nested != null) return nested;
  }

  return 6000;
}

function normalizeTopic(t: DiscourseTopic): DiscourseTopic {
  const excerpt = (t.excerpt || t.excerpt_text || '').trim();
  return { ...t, excerpt };
}

/** Lambda / proxy `{ error, detail }` payloads must not become a silent empty list when status is wrongly 200. */
function throwIfDiscourseProxyErrorPayload(json: unknown): void {
  if (!json || typeof json !== 'object') return;
  const o = json as Record<string, unknown>;
  if (typeof o.error === 'string' && !Array.isArray((o as { topics?: unknown }).topics)) {
    const detail = typeof o.detail === 'string' ? o.detail.slice(0, 300) : '';
    throw new Error(`Discourse proxy: ${o.error}${detail ? ` (${detail})` : ''}`);
  }
}

function topicsFromJson(json: unknown): DiscourseTopic[] {
  const raw = (
    json && typeof json === 'object' && 'topics' in json && Array.isArray((json as { topics?: unknown }).topics)
      ? ((json as { topics: DiscourseTopic[] }).topics ?? [])
      : Array.isArray((json as DiscourseCategoryResponse).topic_list?.topics)
        ? ((json as DiscourseCategoryResponse).topic_list?.topics ?? [])
        : []
  ) as DiscourseTopic[];
  return raw.map(normalizeTopic);
}

/**
 * forum.hpp.io category slugs/ids (see /categories.json). Used for Governance Discussion feed.
 */
/** `general` first — same as legacy single-call default; other categories merge if the proxy allows. */
export const DISCOURSE_GOVERNANCE_CATEGORIES: Array<{ categorySlug: string; categoryId: number }> = [
  { categorySlug: 'general', categoryId: 4 },
  { categorySlug: 'announcements', categoryId: 5 },
  { categorySlug: 'category-1', categoryId: 6 },
  { categorySlug: 'category-3', categoryId: 7 },
];

const DISCOURSE_429_MAX_ATTEMPTS = 5;

async function discourseProxyFetchTopics(fullUrl: string, init?: RequestInit): Promise<DiscourseTopic[]> {
  const fetchOpts: RequestInit = {
    signal: AbortSignal.timeout(10_000),
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.headers as Record<string, string>),
    },
    cache: 'no-store',
  };

  let last429Body = '';

  for (let attempt = 1; attempt <= DISCOURSE_429_MAX_ATTEMPTS; attempt++) {
    const res = await fetch(fullUrl, fetchOpts);

    if (res.status === 429) {
      last429Body = await res.text().catch(() => '');
      const waitMs = parseRateLimitWaitMs(last429Body);
      if (attempt < DISCOURSE_429_MAX_ATTEMPTS) {
        await sleep(waitMs);
        continue;
      }
      throw new Error(
        `Discourse proxy failed (429 rate limit): ${last429Body.slice(0, 400)}`,
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Discourse proxy failed (${res.status}): ${text.slice(0, 220)}`);
    }

    const json = (await res.json()) as unknown;
    throwIfDiscourseProxyErrorPayload(json);
    return topicsFromJson(json);
  }

  throw new Error(`Discourse proxy failed (429): ${last429Body.slice(0, 220)}`);
}

/** One proxy round-trip: `categories=slug:id,...` + `enrich=0`. Fallback: sequential per-category fetch if batch fails (e.g. old proxy). */
export async function fetchDiscourseGovernanceMergedTopics(init?: RequestInit): Promise<DiscourseTopic[]> {
  const proxyUrl = getDiscourseProxyUrl();
  const categoriesParam = DISCOURSE_GOVERNANCE_CATEGORIES.map((c) => `${c.categorySlug}:${c.categoryId}`).join(',');
  const sep = proxyUrl.includes('?') ? '&' : '?';
  const batchUrl = `${proxyUrl}${sep}categories=${encodeURIComponent(categoriesParam)}&enrich=0`;

  try {
    return await discourseProxyFetchTopics(batchUrl, init);
  } catch {
    console.warn('[discourse] governance batch fetch failed — falling back to sequential category requests');
    return fetchDiscourseTopicsMergedSequential(DISCOURSE_GOVERNANCE_CATEGORIES, { gapMs: 280, init });
  }
}

export async function fetchDiscourseGeneralTopics(params?: {
  categorySlug?: string;
  categoryId?: number;
  init?: RequestInit;
}): Promise<DiscourseTopic[]> {
  const categorySlug = params?.categorySlug || 'general';
  const categoryId = params?.categoryId ?? 4;
  const proxyUrl = getDiscourseProxyUrl();
  const sep = proxyUrl.includes('?') ? '&' : '?';
  const url = `${proxyUrl}${sep}categorySlug=${encodeURIComponent(categorySlug)}&categoryId=${encodeURIComponent(String(categoryId))}`;

  return discourseProxyFetchTopics(url, params?.init);
}

/**
 * Fetches multiple categories one after another with a small gap to avoid Discourse rate_limit (429)
 * when the proxy forwards each call to the forum API.
 *
 * Failures are **per category**: one bad slug/503 does not discard topics from other categories.
 * If every category fails (or yields nothing) and there were errors, the last error is thrown so the UI can show it.
 */
export async function fetchDiscourseTopicsMergedSequential(
  categories: Array<{ categorySlug: string; categoryId: number }>,
  options?: { gapMs?: number; init?: RequestInit },
): Promise<DiscourseTopic[]> {
  const gapMs = options?.gapMs ?? 650;
  const init = options?.init;
  const merged: DiscourseTopic[] = [];
  const seen = new Set<number>();
  const failures: Error[] = [];

  for (let i = 0; i < categories.length; i++) {
    const c = categories[i]!;
    try {
      const topics = await fetchDiscourseGeneralTopics({
        categorySlug: c.categorySlug,
        categoryId: c.categoryId,
        init,
      });
      for (const t of topics) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          merged.push(t);
        }
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      failures.push(err);
    }
    if (i < categories.length - 1) {
      await sleep(gapMs);
    }
  }

  merged.sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });

  if (merged.length === 0 && failures.length > 0) {
    throw new Error(failures.map((f) => f.message).join(' · '));
  }

  return merged;
}

export function discourseTopicHref(baseUrl: string, topic: { slug: string; id: number }): string {
  return `${baseUrl.replace(/\/$/, '')}/t/${topic.slug}/${topic.id}`;
}

export function resolveDiscourseImageUrl(baseUrl: string, imageUrl?: string | null): string | null {
  const t = imageUrl?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('//')) return `https:${t}`;
  try {
    return new URL(t.startsWith('/') ? t : `/${t}`, `${baseUrl.replace(/\/$/, '')}/`).href;
  } catch {
    return null;
  }
}
