/**
 * Discourse API helpers for Governance "Discussion" feed.
 */

export interface DiscourseTopic {
  id: number;
  title: string;
  slug: string;
  category_id?: number;
  category_slug?: string;
  category_name?: string;
  created_at?: string;
  excerpt?: string;
  image_url?: string | null;
  excerpt_text?: string;
  blurb?: string;
  summary?: string;
  raw?: string;
  cooked?: string;
}

interface DiscourseCategoryResponse {
  topic_list?: {
    topics?: DiscourseTopic[];
  };
  topics?: DiscourseTopic[];
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstParagraph(text?: string): string {
  const t = (text || '').trim();
  if (!t) return '';
  const first = t.split(/\n\s*\n/)[0] || '';
  return first.trim();
}

function cleanExcerptText(text: string): string {
  let s = text.trim();
  if (!s) return '';

  // Prefer the first non-heading paragraph when content has paragraph breaks.
  const paragraphs = s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length > 1 && /^\d+\.\s+/.test(paragraphs[0] || '')) {
    s = paragraphs.slice(1).join(' ').trim();
  }

  // Drop generic leading labels.
  s = s.replace(/^summary\b[:\-\s]*/i, '');

  // Drop "1. What is X" heading while preserving "X is ..." body sentence.
  s = s.replace(
    /^\d+\.\s*what\s+is\s+([a-z0-9][a-z0-9\s&'/-]{0,80})\s+\1\s+is\b/i,
    '$1 is',
  );

  // Drop numbered heading line only when it's isolated from body by line break.
  s = s.replace(/^\d+\.\s*[^\n]{1,120}\n+/i, '');

  // Drop simple numbered heading prefixes.
  s = s.replace(/^\d+\.\s*(purpose|overview|introduction)\b\s*/i, '');

  // If remaining text is still just a numbered heading, discard it.
  if (/^\d+\.\s*[a-z0-9][a-z0-9\s&'/-]{0,120}$/i.test(s)) {
    return '';
  }

  return s.replace(/\s+/g, ' ').trim();
}

function topicExcerpt(topic: DiscourseTopic): string {
  const candidate =
    topic.excerpt_text ||
    topic.excerpt ||
    topic.summary ||
    topic.blurb ||
    firstParagraph(topic.raw) ||
    firstParagraph(stripHtml(topic.cooked || ''));

  return cleanExcerptText(candidate || '');
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
  const proxyUrl = getDiscourseProxyUrl();
  const targetCategories =
    params?.categorySlug && params?.categoryId != null
      ? [{ slug: params.categorySlug, id: params.categoryId, name: params.categorySlug }]
      : [
          { slug: 'announcements', id: 5, name: 'Announcements' },
          { slug: 'general', id: 4, name: 'General Discussion' },
          { slug: 'category-1', id: 6, name: 'Governance Topic' },
          { slug: 'category-3', id: 7, name: 'Proposals' },
        ];

  const responses = await Promise.all(
    targetCategories.map(async (category) => {
      const sep = proxyUrl.includes('?') ? '&' : '?';
      const url = `${proxyUrl}${sep}categorySlug=${encodeURIComponent(category.slug)}&categoryId=${encodeURIComponent(
        String(category.id),
      )}`;
      const res = await fetch(url, {
        ...params?.init,
        headers: {
          accept: 'application/json',
          ...(params?.init?.headers as Record<string, string>),
        },
        cache: 'no-store',
      });
      if (!res.ok) return [] as DiscourseTopic[];
      const json = (await res.json()) as DiscourseCategoryResponse;
      const list = Array.isArray(json.topics)
        ? json.topics
        : Array.isArray(json.topic_list?.topics)
          ? (json.topic_list?.topics ?? [])
          : [];

      return list.map((topic) => ({
        ...topic,
        category_id: topic.category_id ?? category.id,
        category_slug: category.slug,
        category_name: category.name,
        excerpt: topicExcerpt(topic),
      }));
    }),
  );

  const deduped = new Map<number, DiscourseTopic>();
  for (const topic of responses.flat()) {
    if (!deduped.has(topic.id)) deduped.set(topic.id, topic);
  }

  return [...deduped.values()].sort((a, b) => {
    const aMs = a.created_at ? Date.parse(a.created_at) : 0;
    const bMs = b.created_at ? Date.parse(b.created_at) : 0;
    return bMs - aMs;
  });
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
