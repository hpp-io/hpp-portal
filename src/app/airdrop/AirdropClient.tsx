'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { HPPTickerIcon, FaqOpenIcon, FaqCloseIcon, RightArrowIcon } from '@/assets/icons';
import { navItems, legalLinks } from '@/config/navigation';
import Button from '@/components/ui/Button';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import FaqSection from '@/components/ui/Faq';
import DontMissAirdrop from '@/components/ui/DontMissAirdrop';
import { airdropData } from '@/static/uiData';
import { mockAirdropEvents, mockAirdropEventIds, formatReward, type AirdropEvent, type AirdropStatus } from './mockData';

// Re-export types for backward compatibility
export type { AirdropEvent, AirdropStatus };

export default function AirdropClient() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'HPP' | 'DApp' | 'Collaboration'>('HPP');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set([mockAirdropEventIds[0]]));

  const toggleEvent = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-black overflow-x-hidden">
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
          className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'opacity-50 min-[1200px]:opacity-100' : ''
            }`}
        >
          {/* Hero Section */}
          <div className="py-12.5">
            <div className="px-5 max-w-6xl mx-auto">
              <div className="w-full flex justify-center">
                <DotLottieReact
                  src="/lotties/Airdrop.lottie"
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
              <h1 className="text-[50px] leading-[1.5] font-[900] text-white text-center">
                One Gateway. Every HPP Airdrop.
              </h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-5xl text-center">
                Discover, join, and claim all airdrop events across the HPP ecosystem, seamlessly in one place.
              </p>
            </div>
          </div>

          {/* Information Cards */}
          <div className="px-5 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Discover Card */}
              <div className="rounded-[5px] p-6 bg-primary flex flex-col">
                <h3 className="text-white text-xl font-semibold leading-[24px] mb-2.5">Discover</h3>
                <p className="text-white text-base font-normal leading-[1.5] tracking-[0.8px]">
                  Explore all HPP airdrops in one place. Track distributions and ecosystem connections.
                </p>
              </div>

              {/* Join Card */}
              <div className="rounded-[5px] p-6 bg-primary flex flex-col">
                <h3 className="text-white text-xl font-semibold leading-[24px] mb-2.5">Join</h3>
                <p className="text-white text-base font-normal leading-[1.5] tracking-[0.8px]">
                  Clear rules, clear rewards. View eligibility, allocation, and vesting with full transparency.
                </p>
              </div>

              {/* Claim Card */}
              <div className="rounded-[5px] p-6 bg-primary flex flex-col">
                <h3 className="text-white text-xl font-semibold leading-[24px] mb-2.5">Claim</h3>
                <p className="text-white text-base font-normal leading-[1.5] tracking-[0.8px]">
                  Never miss a claim. Stay ahead of claim timelines and get ready before claim windows open.
                </p>
              </div>
            </div>
          </div>

          {/* Event Section */}
          <div className="px-5 max-w-6xl mx-auto mt-35">
            {/* Tab Buttons */}
            <div className="flex gap-2.5 mb-5">
              <button
                onClick={() => setActiveTab('HPP')}
                className={`px-5 py-2.5 rounded-[23px] text-base font-normal transition-colors cursor-pointer ${activeTab === 'HPP'
                    ? 'bg-[#5DF23F] text-black'
                    : 'bg-[#121212] text-white'
                  }`}
              >
                HPP
              </button>
              <button
                onClick={() => setActiveTab('DApp')}
                className={`px-5 py-2.5 rounded-[23px] text-base font-normal transition-colors cursor-pointer ${activeTab === 'DApp'
                    ? 'bg-[#5DF23F] text-black'
                    : 'bg-[#121212] text-white'
                  }`}
              >
                DApp
              </button>
              <button
                onClick={() => setActiveTab('Collaboration')}
                className={`px-5 py-2.5 rounded-[23px] text-base font-normal transition-colors cursor-pointer ${activeTab === 'Collaboration'
                    ? 'bg-[#5DF23F] text-black'
                    : 'bg-[#121212] text-white'
                  }`}
              >
                Collaboration
              </button>
            </div>

            {/* Mobile/Tablet View (1200px 미만) */}
            {activeTab === 'HPP' && (
              <div className="min-[1200px]:hidden">
                {mockAirdropEvents.map((event) => {
                  const IconComponent = event.icon;
                  return (
                    <div key={event.id} className="rounded-[5px] bg-[#121212] border border-[#2D2D2D] overflow-hidden">
                      {/* Header */}
                      <button
                        onClick={() => router.push(`/airdrop/${event.id}`)}
                        className="w-full px-5 py-5 flex items-center justify-between border-b border-[#2D2D2D] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <IconComponent className="w-6 h-6 text-white flex-shrink-0" />
                          <span className="text-white text-lg font-semibold leading-[1.2]">{event.name}</span>
                        </div>
                        <FaqCloseIcon className="w-4 h-4 text-white opacity-80" />
                      </button>

                      {/* Table Content */}
                      <div className="px-5 py-5">
                        {/* Table Header */}
                        <div className="grid grid-cols-5 gap-4 mb-4">
                          <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Event</div>
                          <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Reward</div>
                          <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Starts</div>
                          <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Ends</div>
                          <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Status</div>
                        </div>

                        {/* Table Row */}
                        <div className="grid grid-cols-5 gap-4 mb-5">
                          <div className="text-white text-base leading-[1]">{event.eventName}</div>
                          <div className="text-white text-base leading-[1]">{`${formatReward(event.reward)} HPP Token`}</div>
                          <div className="text-white text-base leading-[1]">{event.starts}</div>
                          <div className="text-white text-base leading-[1]">{event.ends}</div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                event.status === 'On-Going'
                                  ? 'bg-[#5DF23F]'
                                  : event.status === 'Coming Soon'
                                    ? 'bg-[#FFA500]'
                                    : 'bg-[#999999]'
                              }`}
                            ></span>
                            <span
                              className={`text-sm leading-[1] ${
                                event.status === 'On-Going'
                                  ? 'text-[#5DF23F]'
                                  : event.status === 'Coming Soon'
                                    ? 'text-[#FFA500]'
                                    : 'text-white'
                              }`}
                            >
                              {event.status}
                            </span>
                          </div>
                        </div>

                        {/* Claim Button */}
                        <div className="flex justify-end">
                          <Button
                            variant="white"
                            size="md"
                            className="cursor-pointer"
                            onClick={() => router.push(`/airdrop/${event.id}`)}
                          >
                            Go to Claim
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Desktop View (1200px+) - Table Style */}
            <div className="hidden min-[1200px]:block overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr_auto] gap-4 px-5 py-4 bg-[#121212] rounded-[5px]">
                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Event</div>
                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Reward</div>
                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Starts</div>
                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Ends</div>
                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Status</div>
                <div></div>
              </div>

              {/* Table Content */}
              {activeTab === 'HPP' ? (
                <div>
                  {mockAirdropEvents.map((event) => {
                    const IconComponent = event.icon;
                    return (
                      <div
                        key={event.id}
                        tabIndex={0}
                        onClick={() => router.push(`/airdrop/${event.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(`/airdrop/${event.id}`);
                          }
                        }}
                        className="w-full grid grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr_auto] gap-4 px-5 py-4 hover:bg-[#1a1a1a] transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <IconComponent className="w-5 h-5 text-white flex-shrink-0" />
                          <span className="text-white text-base leading-[1]">{event.name}</span>
                        </div>
                        <div className="text-white text-base leading-[1]">{`${formatReward(event.reward)}`}</div>
                        <div className="text-white text-base leading-[1]">{event.starts}</div>
                        <div className="text-white text-base leading-[1]">{event.ends}</div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              event.status === 'On-Going'
                                ? 'bg-[#5DF23F]'
                                : event.status === 'Coming Soon'
                                  ? 'bg-[#FFA500]'
                                  : 'bg-[#999999]'
                            }`}
                          ></span>
                          <span
                            className={`text-sm leading-[1] ${
                              event.status === 'On-Going'
                                ? 'text-[#5DF23F]'
                                : event.status === 'Coming Soon'
                                  ? 'text-[#FFA500]'
                                  : 'text-white'
                            }`}
                          >
                            {event.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-end text-white">
                          <RightArrowIcon className="w-5 h-5 fill-current" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <p className="text-[#bfbfbf] text-base leading-[1] py-4">Coming Soon</p>
                </div>
              )}
            </div>

            {/* Coming Soon Message for DApp and Collaboration (Mobile/Tablet) */}
            {(activeTab === 'DApp' || activeTab === 'Collaboration') && (
              <div className="min-[1200px]:hidden">
                <div className="rounded-[5px] bg-[#121212] border border-[#2D2D2D] overflow-hidden">
                  <div className="flex items-center justify-center">
                    <p className="text-[#bfbfbf] text-base leading-[1] py-4">Coming Soon</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FAQ Section */}
          <div className="px-5 max-w-6xl mx-auto mt-20 mb-20">
            <FaqSection items={airdropData.faq} />
          </div>

          {/* Don't Miss the Next Airdrop Section */}
          <DontMissAirdrop />

          <Footer />
        </main>
      </div>
    </div>
  );
}
