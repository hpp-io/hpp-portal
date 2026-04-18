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

  const res = await fetch(url, {
    ...params?.init,
    headers: {
      accept: 'application/json',
      ...(params?.init?.headers as Record<string, string>),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discourse proxy failed (${res.status}): ${text.slice(0, 220)}`);
  }

  const json = (await res.json()) as unknown;
  const topics = (
    json && typeof json === 'object' && 'topics' in json && Array.isArray((json as { topics?: unknown }).topics)
      ? ((json as { topics: DiscourseTopic[] }).topics ?? [])
      : Array.isArray((json as DiscourseCategoryResponse).topic_list?.topics)
        ? ((json as DiscourseCategoryResponse).topic_list?.topics ?? [])
        : []
  ) as DiscourseTopic[];

  return topics;
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
