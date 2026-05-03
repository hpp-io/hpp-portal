/**
 * Discourse API helpers for Governance "Discussion" feed.
 */

export interface DiscourseTopic {
  id: number;
  title: string;
  slug: string;
  created_at?: string;
  excerpt?: string;
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

function topicsFromJson(json: unknown): DiscourseTopic[] {
  return (
    json && typeof json === 'object' && 'topics' in json && Array.isArray((json as { topics?: unknown }).topics)
      ? ((json as { topics: DiscourseTopic[] }).topics ?? [])
      : Array.isArray((json as DiscourseCategoryResponse).topic_list?.topics)
        ? ((json as DiscourseCategoryResponse).topic_list?.topics ?? [])
        : []
  ) as DiscourseTopic[];
}

const DISCOURSE_429_MAX_ATTEMPTS = 5;

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

  const fetchOpts: RequestInit = {
    ...params?.init,
    headers: {
      accept: 'application/json',
      ...(params?.init?.headers as Record<string, string>),
    },
    cache: 'no-store',
  };

  let last429Body = '';

  for (let attempt = 1; attempt <= DISCOURSE_429_MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, fetchOpts);

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
    return topicsFromJson(json);
  }

  throw new Error(`Discourse proxy failed (429): ${last429Body.slice(0, 220)}`);
}

/**
 * Fetches multiple categories one after another with a small gap to avoid Discourse rate_limit (429)
 * when the proxy forwards each call to the forum API.
 */
export async function fetchDiscourseTopicsMergedSequential(
  categories: Array<{ categorySlug: string; categoryId: number }>,
  options?: { gapMs?: number; init?: RequestInit },
): Promise<DiscourseTopic[]> {
  const gapMs = options?.gapMs ?? 650;
  const init = options?.init;
  const merged: DiscourseTopic[] = [];
  const seen = new Set<number>();

  for (let i = 0; i < categories.length; i++) {
    const c = categories[i]!;
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
    if (i < categories.length - 1) {
      await sleep(gapMs);
    }
  }

  merged.sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });

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
