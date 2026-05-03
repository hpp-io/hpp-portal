export type MediumFeedItem = {
  id: string;
  title: string;
  href: string;
  excerpt: string;
  isoDate: string;
  dateLabel: string;
};

type ManualMediumPost = {
  id: string;
  title: string;
  href: string;
  excerpt: string;
  isoDate: string;
};

// NOTE: Medium RSS is unstable for our use-case, so we maintain this list manually.
const MANUAL_MEDIUM_POSTS: ManualMediumPost[] = [
  {
    id: 'manual-aergo-update',
    title: 'HPP DAO Is Now Live',
    href: 'https://medium.com/aergo/7f3350a32a48',
    excerpt:
      'House Party Protocol’s official on-chain governance system launches today. Every HPP token holder can now have a say in the protocol’s direction.',
    isoDate: '2026-04-20T00:00:00.000Z',
  },
];

function toMediumFeedItem(post: ManualMediumPost): MediumFeedItem {
  const parsedDate = new Date(post.isoDate);
  const isoDate = Number.isNaN(parsedDate.getTime()) ? new Date(0).toISOString() : parsedDate.toISOString();

  return {
    id: post.id.trim(),
    title: post.title.trim(),
    href: post.href.trim(),
    excerpt: post.excerpt.trim(),
    isoDate,
    dateLabel: new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  };
}

export async function fetchMediumFeedItems(init?: RequestInit): Promise<MediumFeedItem[]> {
  const _ = init;
  void _;

  return MANUAL_MEDIUM_POSTS.map(toMediumFeedItem)
    .filter((item) => item.title && item.href)
    .sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());
}

export function getManualMediumFeedItems(): MediumFeedItem[] {
  return MANUAL_MEDIUM_POSTS.map(toMediumFeedItem)
    .filter((item) => item.title && item.href)
    .sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());
}
