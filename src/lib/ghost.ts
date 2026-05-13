export type GhostFeedItem = {
  id: string;
  title: string;
  href: string;
  excerpt: string;
  imageSrc: string | null;
  isoDate: string;
  dateLabel: string;
};

type GhostPost = {
  id: string;
  title: string;
  url: string;
  excerpt?: string | null;
  custom_excerpt?: string | null;
  feature_image?: string | null;
  published_at: string;
};

type GhostContentResponse = {
  posts?: GhostPost[];
};

const GHOST_BLOG_API_URL = process.env.NEXT_PUBLIC_BLOG_API_URL || 'https://hppio.ghost.io';
const GHOST_CONTENT_API_KEY = process.env.NEXT_PUBLIC_GHOST_CONTENT_API_KEY;

function toPreferredGhostImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  const trimmed = String(src).trim();
  if (!trimmed) return null;
  // Keep Ghost-resized GIF URLs as-is to avoid decoding very large originals.
  if (/\.gif($|\?)/i.test(trimmed)) return trimmed;
  // Prefer original Ghost asset path when API returns a resized variant (/size/wXXX/...)
  return trimmed.replace(/\/content\/images\/size\/w\d+\//, '/content/images/');
}

function toGhostFeedItem(post: GhostPost): GhostFeedItem {
  const parsedDate = new Date(post.published_at);
  const isoDate = Number.isNaN(parsedDate.getTime()) ? new Date(0).toISOString() : parsedDate.toISOString();

  return {
    id: String(post.id || '').trim(),
    title: String(post.title || '').trim(),
    href: String(post.url || '').trim(),
    excerpt: String(post.custom_excerpt || post.excerpt || '').trim(),
    imageSrc: toPreferredGhostImageSrc(post.feature_image),
    isoDate,
    dateLabel: new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  };
}

export async function fetchGhostFeedItems(init?: RequestInit): Promise<GhostFeedItem[]> {
  if (!GHOST_CONTENT_API_KEY) {
    throw new Error('NEXT_PUBLIC_GHOST_CONTENT_API_KEY is not set');
  }

  const base = GHOST_BLOG_API_URL.replace(/\/+$/, '');
  const endpoint = `${base}/ghost/api/content/posts/?key=${encodeURIComponent(GHOST_CONTENT_API_KEY)}&limit=20&order=published_at%20desc&fields=id,title,url,excerpt,custom_excerpt,feature_image,published_at`;
  const response = await fetch(endpoint, {
    method: 'GET',
    ...init,
    headers: {
      Accept: 'application/json',
      'Accept-Version': 'v6.0',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Ghost posts fetch failed (${response.status})`);
  }

  const data = (await response.json()) as GhostContentResponse;
  const posts = Array.isArray(data?.posts) ? data.posts : [];

  return posts
    .map(toGhostFeedItem)
    .filter((item) => item.title && item.href)
    .sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());
}

export function getManualGhostFeedItems(): GhostFeedItem[] {
  return [];
}
