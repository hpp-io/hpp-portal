'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { navItems, legalLinks } from '@/config/navigation';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Discourse, Forum, Report, DiscourseThumbnail } from '@/assets/icons';
import FaqSection from '@/components/ui/Faq';
import { governanceData } from '@/static/uiData';
import { useHppChain } from '@/app/staking/hppClient';
import dayjs from '@/lib/dayjs';
import type { AgoraProposal } from '@/lib/agora';
import {
  excerptFromMarkdownBody,
  fetchAgoraProposals,
  firstMarkdownImageUrl,
  getAgoraApiBase,
  getAgoraWebBase,
  makeHipFallbackImageDataUrl,
  proposalDetailHref,
  resolveAgoraAssetUrl,
} from '@/lib/agora';
import {
  discourseTopicHref,
  fetchDiscourseGeneralTopics,
  getDiscourseBase,
  type DiscourseTopic,
} from '@/lib/discourse';

const DISCUSSIONS_PAGE_SIZE = 6;

type GovernanceFeedKind = 'proposal' | 'discussion' | 'update';
type GovernanceFilter = 'all' | GovernanceFeedKind;

type GovernanceFeedItem = {
  id: string;
  kind: GovernanceFeedKind;
  title: string;
  excerpt: string;
  href: string;
  imageSrc: string;
  createdAtMs: number;
  isoDate: string;
  dateLabel: string;
};

function getKindBadgeClass(kind: GovernanceFeedKind): string {
  if (kind === 'proposal') return 'bg-[#5651d8] text-white';
  if (kind === 'discussion') return 'bg-[#FAE13E] text-black';
  return 'bg-[#5DF23F] text-black';
}

function getKindLabel(kind: GovernanceFeedKind): string {
  if (kind === 'proposal') return 'Proposal';
  if (kind === 'discussion') return 'Discussion';
  return 'Update';
}

function getFilterButtonClass(filterId: GovernanceFilter, active: boolean): string {
  if (!active) return 'bg-[#121212] text-white hover:bg-[#1B1B1B]';
  return 'bg-primary text-white';
}

function discussionKindFromTitle(title: string): GovernanceFeedKind {
  const s = title.toLowerCase();
  if (s.includes('update')) return 'update';
  return 'discussion';
}

/** 1-based page numbers with ellipses when there are many pages */
function getPaginationItems(totalPages: number, currentPageIndex: number): Array<number | 'ellipsis'> {
  if (totalPages <= 1) return [];
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const cur = currentPageIndex + 1;
  const set = new Set<number>();
  set.add(1);
  set.add(totalPages);
  for (let i = cur - 1; i <= cur + 1; i++) {
    if (i >= 1 && i <= totalPages) set.add(i);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: Array<number | 'ellipsis'> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push('ellipsis');
    out.push(sorted[i]!);
  }
  return out;
}

const governanceCards = [
  {
    title: 'Discourse Forum',
    description: 'Legacy hybrid infrastructure at the core of HPP, now transitioning into an AI-native foundation.',
    href: 'https://forum.hpp.io',
    icon: Discourse,
  },
  {
    title: 'Voting Layer',
    description: 'RWA and NFT valuation layer enabling AI-driven asset discovery, pricing, and strategy execution.',
    href: 'https://agora-sepolia.hpp.io',
    icon: Forum,
  },
  {
    title: 'HPP Report',
    description: 'Personhood verification and Sybil resistance powered by AI-based deepfake detection and biometrics.',
    href: 'https://medium.com/aergo',
    icon: Report,
  },
];

export default function GovernanceClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { id: chainId } = useHppChain();
  const agoraApiBase = useMemo(() => getAgoraApiBase(chainId), [chainId]);
  const agoraWebBase = useMemo(() => getAgoraWebBase(chainId), [chainId]);
  const discourseBase = useMemo(() => getDiscourseBase(), []);

  const [feedItems, setFeedItems] = useState<GovernanceFeedItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<GovernanceFilter>('all');
  const [discussionsLoading, setDiscussionsLoading] = useState(true);
  const [discussionsError, setDiscussionsError] = useState<string | null>(null);
  const [discussionsPage, setDiscussionsPage] = useState(0);

  const loadGovernanceFeed = useCallback(async () => {
    setDiscussionsLoading(true);
    setDiscussionsError(null);
    try {
      const [agoraResult, discourseResult] = await Promise.allSettled([
        fetchAgoraProposals(agoraApiBase),
        fetchDiscourseGeneralTopics(),
      ]);

      const agoraItems: GovernanceFeedItem[] =
        agoraResult.status === 'fulfilled'
          ? agoraResult.value.map((post: AgoraProposal) => {
              const imgRef = firstMarkdownImageUrl(post.body);
              const imageSrc = imgRef
                ? resolveAgoraAssetUrl(agoraApiBase, imgRef)
                : makeHipFallbackImageDataUrl(post.id);
              const createdAtMs = dayjs.unix(post.createdAt).valueOf();
              return {
                id: `proposal-${post.id}`,
                kind: 'proposal',
                title: post.title,
                excerpt: excerptFromMarkdownBody(post.body),
                href: proposalDetailHref(agoraWebBase, post.id),
                imageSrc,
                createdAtMs,
                isoDate: dayjs(createdAtMs).toISOString(),
                dateLabel: dayjs(createdAtMs).format('MMM D, YYYY'),
              };
            })
          : [];

      const discourseItems: GovernanceFeedItem[] =
        discourseResult.status === 'fulfilled'
          ? discourseResult.value.map((topic: DiscourseTopic) => {
              const createdAtMs = topic.created_at ? dayjs(topic.created_at).valueOf() : Date.now();
              return {
                id: `discourse-${topic.id}`,
                kind: discussionKindFromTitle(topic.title),
                title: topic.title,
                excerpt: topic.excerpt || '',
                href: discourseTopicHref(discourseBase, topic),
                imageSrc: DiscourseThumbnail.src,
                createdAtMs,
                isoDate: dayjs(createdAtMs).toISOString(),
                dateLabel: dayjs(createdAtMs).format('MMM D, YYYY'),
              };
            })
          : [];

      const merged = [...agoraItems, ...discourseItems].sort((a, b) => b.createdAtMs - a.createdAtMs);
      setFeedItems(merged);
      setDiscussionsPage(0);
    } catch (e) {
      setFeedItems([]);
      setDiscussionsError(e instanceof Error ? e.message : 'Failed to load governance feed');
    } finally {
      setDiscussionsLoading(false);
    }
  }, [agoraApiBase, agoraWebBase, discourseBase]);

  useEffect(() => {
    void loadGovernanceFeed();
  }, [loadGovernanceFeed]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return feedItems;
    return feedItems.filter((item) => item.kind === activeFilter);
  }, [activeFilter, feedItems]);

  const totalDiscussionPages = Math.max(1, Math.ceil(filteredItems.length / DISCUSSIONS_PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = discussionsPage * DISCUSSIONS_PAGE_SIZE;
    return filteredItems.slice(start, start + DISCUSSIONS_PAGE_SIZE);
  }, [filteredItems, discussionsPage]);

  useEffect(() => {
    if (discussionsPage > 0 && discussionsPage >= totalDiscussionPages) {
      setDiscussionsPage(Math.max(0, totalDiscussionPages - 1));
    }
  }, [discussionsPage, totalDiscussionPages]);

  const discussionPaginationItems = useMemo(
    () => getPaginationItems(totalDiscussionPages, discussionsPage),
    [totalDiscussionPages, discussionsPage],
  );
  const filterCounts = useMemo(
    () => ({
      proposal: feedItems.filter((item) => item.kind === 'proposal').length,
      discussion: feedItems.filter((item) => item.kind === 'discussion').length,
      update: feedItems.filter((item) => item.kind === 'update').length,
    }),
    [feedItems],
  );

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
            sidebarOpen ? 'opacity-50 min-[1200px]:opacity-100' : ''
          }`}
        >
          {/* Hero Section (same style as non-home pages) */}
          <div className="py-12.5">
            <div className="px-5 max-w-6xl mx-auto">
              <div className="w-full flex justify-center">
                <DotLottieReact
                  src="/lotties/DAO.lottie"
                  autoplay
                  loop
                  className="w-[80px] h-[80px]"
                  renderConfig={{
                    autoResize: true,
                    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2,
                    freezeOnOffscreen: true,
                  }}
                  layout={{ fit: 'contain', align: [0.5, 0.5] }}
                />
              </div>
              <h1 className="text-[50px] leading-[1.5] font-[900] text-white text-center">HPP Governance</h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-7xl text-center">
                HPP Governance isn't a feature. It's the foundation of the AI-native ecosystem.
              </p>
            </div>
          </div>

          <div className="px-5 max-w-6xl mx-auto mt-20">
            <h2 className="text-3xl leading-[1.5] font-[900] text-white mb-5">Core Governance Access</h2>
            <div className="grid grid-cols-1 min-[810px]:grid-cols-3 gap-5 justify-items-center">
              {governanceCards.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block rounded-[5px] p-5 pb-10 border border-transparent bg-primary w-full lg:max-w-[400px] transition-transform duration-200 hover:opacity-95"
                >
                  <div className="mb-3 flex items-center">
                    <Image src={item.icon} alt={item.title} width={50} height={50} className="rounded-[5px]" />
                  </div>
                  <h3 className="text-xl leading-[24px] tracking-[0] font-semibold text-white mb-2.5">{item.title}</h3>
                  <p className="text-base text-white leading-[1.5] font-normal tracking-[0.8px]">{item.description}</p>
                  <div className="absolute bottom-5 right-5">
                    <svg className="w-[22px] h-[22px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* OnGoing Discussions — HPP Agora GET /proposals */}
          <div className="px-5 max-w-6xl mx-auto mt-20">
            <h2 className="text-3xl leading-[1.5] font-[900] text-white mb-5">OnGoing Discussions</h2>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {[
                { id: 'all' as const, label: 'ALL' },
                { id: 'proposal' as const, label: `Proposal ${filterCounts.proposal}` },
                { id: 'discussion' as const, label: `Discussion ${filterCounts.discussion}` },
                { id: 'update' as const, label: `Update ${filterCounts.update}` },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => {
                    setActiveFilter(filter.id);
                    setDiscussionsPage(0);
                  }}
                  className={[
                    'rounded-full px-5 py-2.5 text-base leading-[1] font-medium transition-colors cursor-pointer',
                    getFilterButtonClass(filter.id, activeFilter === filter.id),
                  ].join(' ')}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {discussionsLoading && (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-[5px] bg-[#111111] py-16">
                <DotLottieReact
                  src="/lotties/Loading.lottie"
                  autoplay
                  loop
                  className="h-[48px] w-[48px]"
                  renderConfig={{
                    autoResize: true,
                    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2,
                    freezeOnOffscreen: true,
                  }}
                  layout={{ fit: 'contain', align: [0.5, 0.5] }}
                />
              </div>
            )}

            {!discussionsLoading && discussionsError && (
              <div className="rounded-[5px] bg-[#111111] px-5 py-10 text-center">
                <p className="text-base text-[#bfbfbf] mb-4">{discussionsError}</p>
                <p className="text-sm text-[#888] mb-6 max-w-xl mx-auto">
                  Ensure <code className="text-white">NEXT_PUBLIC_HPP_AGORA_API_URL</code> and
                  <code className="text-white"> NEXT_PUBLIC_HPP_DISCOURSE_PROXY_URL</code> are configured.
                </p>
                <Button variant="white" size="md" onClick={() => void loadGovernanceFeed()} className="cursor-pointer">
                  Retry
                </Button>
              </div>
            )}

            {!discussionsLoading && !discussionsError && filteredItems.length === 0 && (
              <div className="rounded-[5px] bg-[#111111] px-5 py-16 text-center text-[#bfbfbf]">
                {activeFilter === 'all'
                  ? 'Governance posts coming soon'
                  : `${activeFilter.charAt(0).toUpperCase()}${activeFilter.slice(1)}s coming soon`}
              </div>
            )}

            {!discussionsLoading && !discussionsError && filteredItems.length > 0 && (
              <>
                <div className="hpp-governance-discussions-grid">
                  {pagedItems.map((item) => {
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative grid h-full w-full grid-rows-[168px_minmax(0,1fr)] overflow-hidden rounded-[5px] bg-[#111111] transition-opacity duration-200 hover:opacity-95 min-h-[340px] md:grid-rows-[176px_minmax(0,1fr)] md:min-h-[300px]"
                      >
                        <div className="relative min-h-0 min-w-0 bg-[#1a1a1a]">
                          <Image
                            src={item.imageSrc}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 767px) 100vw, (max-width: 1439px) 50vw, 33vw"
                          />
                        </div>
                        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-5 pb-12">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <time className="text-sm font-normal leading-[1.5] text-[#bfbfbf]" dateTime={item.isoDate}>
                              {item.dateLabel}
                            </time>
                            <span
                              className={`rounded-[5px] px-3 py-1.5 text-sm font-medium leading-[1] ${getKindBadgeClass(item.kind)}`}
                            >
                              {getKindLabel(item.kind)}
                            </span>
                          </div>
                          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                            <h3 className="min-w-0 break-words text-xl font-bold leading-[1.35] text-white">
                              {item.title}
                            </h3>
                            <p className="mt-2 min-h-0 text-base font-normal leading-[1.5] text-[#bfbfbf] line-clamp-3">
                              {item.excerpt}
                            </p>
                          </div>
                          <div className="absolute bottom-5 right-5">
                            <svg
                              className="h-[22px] w-[22px] text-white transition-transform duration-200 group-hover:translate-x-0.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7l5 5-5 5M6 12h12"
                              />
                            </svg>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>

                {discussionPaginationItems.length > 0 && (
                  <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Proposals pages">
                    {discussionPaginationItems.map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="flex h-10 min-w-10 items-center justify-center px-1 text-sm font-medium text-[#666]"
                          aria-hidden
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          aria-label={`Page ${item}`}
                          aria-current={item === discussionsPage + 1 ? 'page' : undefined}
                          onClick={() => setDiscussionsPage(item - 1)}
                          className={[
                            'flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-semibold tabular-nums transition-colors',
                            item === discussionsPage + 1
                              ? 'bg-primary text-white'
                              : 'bg-[#111111] text-[#bfbfbf] hover:bg-white/[0.06] hover:text-white',
                          ].join(' ')}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  </nav>
                )}
              </>
            )}
          </div>

          <div className="px-5 max-w-6xl mx-auto mt-20 mb-25 w-full">
            <FaqSection title="Frequently Asked Questions" items={governanceData.faq} />
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
