'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { navItems, legalLinks } from '@/config/navigation';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Aergo, Aqt, Booost } from '@/assets/icons';
import FaqSection from '@/components/ui/Faq';
import { governanceData } from '@/static/uiData';
import { useHppChain } from '@/app/staking/hppClient';
import dayjs from '@/lib/dayjs';
import type { AgoraProposal } from '@/lib/agora';
import {
  excerptFromMarkdownBody,
  fetchAgoraProposals,
  firstMarkdownImageUrl,
  formatProposalStatusLabel,
  getAgoraApiBase,
  getAgoraWebBase,
  makeHipFallbackImageDataUrl,
  proposalDetailHref,
  resolveAgoraAssetUrl,
} from '@/lib/agora';

const DISCUSSIONS_PAGE_SIZE = 6;

function getProposalStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      // Same green tone used across staking/airdrop "on-going" indicators
      return 'bg-[#5DF23F] text-black';
    case 'passed':
      // Keep default governance badge tone
      return 'bg-[#5651d8] text-white';
    case 'failed':
      // Error/failure tone used in form error states
      return 'bg-[#FF1312] text-white';
    case 'cancelled':
      return 'bg-[#9E9E9E] text-black';
    case 'pending':
    default:
      return 'bg-[#5651d8] text-white';
  }
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
    icon: Aergo,
  },
  {
    title: 'Voting Layer',
    description: 'RWA and NFT valuation layer enabling AI-driven asset discovery, pricing, and strategy execution.',
    href: 'https://snapshot.box/#/s:hpp.eth',
    icon: Aqt,
  },
  {
    title: 'HPP Report',
    description: 'Personhood verification and Sybil resistance powered by AI-based deepfake detection and biometrics.',
    href: 'https://www.booost.live',
    icon: Booost,
  },
];

export default function GovernanceClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { id: chainId } = useHppChain();
  const agoraApiBase = useMemo(() => getAgoraApiBase(chainId), [chainId]);
  const agoraWebBase = useMemo(() => getAgoraWebBase(chainId), [chainId]);

  const [proposals, setProposals] = useState<AgoraProposal[]>([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(true);
  const [discussionsError, setDiscussionsError] = useState<string | null>(null);
  const [discussionsPage, setDiscussionsPage] = useState(0);

  const loadProposals = useCallback(async () => {
    setDiscussionsLoading(true);
    setDiscussionsError(null);
    try {
      const list = await fetchAgoraProposals(agoraApiBase);
      setProposals(list);
      setDiscussionsPage(0);
    } catch (e) {
      setProposals([]);
      setDiscussionsError(e instanceof Error ? e.message : 'Failed to load proposals');
    } finally {
      setDiscussionsLoading(false);
    }
  }, [agoraApiBase]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  const totalDiscussionPages = Math.max(1, Math.ceil(proposals.length / DISCUSSIONS_PAGE_SIZE));
  const pagedProposals = useMemo(() => {
    const start = discussionsPage * DISCUSSIONS_PAGE_SIZE;
    return proposals.slice(start, start + DISCUSSIONS_PAGE_SIZE);
  }, [proposals, discussionsPage]);

  useEffect(() => {
    if (discussionsPage > 0 && discussionsPage >= totalDiscussionPages) {
      setDiscussionsPage(Math.max(0, totalDiscussionPages - 1));
    }
  }, [discussionsPage, totalDiscussionPages]);

  const discussionPaginationItems = useMemo(
    () => getPaginationItems(totalDiscussionPages, discussionsPage),
    [totalDiscussionPages, discussionsPage],
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
                  src="/lotties/Ecosystem.lottie"
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
                A place where community and decentralization come together to build the future.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button variant="white" size="md" href="https://forum.hpp.io" external className="cursor-pointer">
                  💬 Visit Forum
                </Button>
                <Button
                  variant="white"
                  size="md"
                  href="https://snapshot.box/#/s:hpp.eth"
                  external
                  className="cursor-pointer"
                >
                  🗳️ Go to Vote
                </Button>
              </div>
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
                  className="relative block rounded-[5px] p-6 pb-10 border border-transparent bg-primary w-full lg:max-w-[400px] transition-transform duration-200 hover:opacity-95"
                >
                  <div className="mb-3 flex items-center">
                    <div className="w-12.5 h-12.5 bg-white rounded-[5px] flex items-center justify-center">
                      <Image src={item.icon} alt={item.title} width={28} height={28} />
                    </div>
                  </div>
                  <h3 className="text-xl leading-[24px] tracking-[0] font-semibold text-white mb-2.5">{item.title}</h3>
                  <p className="text-base text-[#FFED2B] leading-[1.5] font-normal tracking-[0.8px]">
                    {item.description}
                  </p>
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
                  If this is a local build, the Agora API must allow your origin in CORS (see Workers API docs). You can
                  set <code className="text-white">NEXT_PUBLIC_HPP_AGORA_API_URL</code> to point to the correct
                  environment.
                </p>
                <Button variant="white" size="md" onClick={() => void loadProposals()} className="cursor-pointer">
                  Retry
                </Button>
              </div>
            )}

            {!discussionsLoading && !discussionsError && proposals.length === 0 && (
              <div className="rounded-[5px] bg-[#111111] px-5 py-16 text-center text-[#bfbfbf]">
                No proposals yet. Check back soon or open Agora to create one.
              </div>
            )}

            {!discussionsLoading && !discussionsError && proposals.length > 0 && (
              <>
                <div className="hpp-governance-discussions-grid">
                  {pagedProposals.map((post) => {
                    const imgRef = firstMarkdownImageUrl(post.body);
                    const imageSrc = imgRef
                      ? resolveAgoraAssetUrl(agoraApiBase, imgRef)
                      : makeHipFallbackImageDataUrl(post.id);
                    const href = proposalDetailHref(agoraWebBase, post.id);
                    const dateLabel = dayjs.unix(post.createdAt).format('MMM D, YYYY');
                    const isoDate = dayjs.unix(post.createdAt).toISOString();
                    const excerpt = excerptFromMarkdownBody(post.body);
                    const statusLabel = formatProposalStatusLabel(post.status);
                    const statusBadgeClass = getProposalStatusBadgeClass(post.status);

                    return (
                      <a
                        key={post.id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative grid h-full w-full grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-[5px] bg-[#111111] transition-opacity duration-200 hover:opacity-95 aspect-[10/11] md:aspect-auto md:min-h-[300px]"
                      >
                        <div className="relative min-h-0 min-w-0 bg-[#1a1a1a]">
                          <Image
                            src={imageSrc}
                            alt={post.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 767px) 100vw, (max-width: 1439px) 50vw, 33vw"
                          />
                        </div>
                        <div className="relative flex min-h-0 flex-col overflow-hidden p-5 pb-12">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <time className="text-sm font-normal leading-[1.5] text-[#bfbfbf]" dateTime={isoDate}>
                              {dateLabel}
                            </time>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${statusBadgeClass}`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold leading-[1.35] text-white line-clamp-2">{post.title}</h3>
                          <p className="mt-2 text-base font-normal leading-[1.5] text-[#bfbfbf] line-clamp-3">
                            {excerpt}
                          </p>
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
                            'flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-[5px] px-3 text-sm font-semibold tabular-nums transition-colors ring-1 ring-inset',
                            item === discussionsPage + 1
                              ? 'bg-primary text-white ring-transparent'
                              : 'bg-[#111111] text-[#bfbfbf] ring-white/[0.08] hover:bg-white/[0.06] hover:text-white',
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
