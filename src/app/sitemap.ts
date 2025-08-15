import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

  const routes = ['', '/bridge', '/migration', '/ecosystem', '/airdrop'] as const;
  const now = new Date();

  const withTrailingSlash = (path: string) => {
    if (path === '') return '/';
    return path.endsWith('/') ? path : `${path}/`;
  };

  return routes.map((path) => ({
    url: `${siteUrl}${withTrailingSlash(path)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: path === '' ? 1 : 0.7,
  }));
}
