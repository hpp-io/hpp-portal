'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { HPPTickerIcon, RightArrowIcon, DownIcon } from '@/assets/icons';
import { navItems, legalLinks } from '@/config/navigation';
import Button from '@/components/ui/Button';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import FaqSection from '@/components/ui/Faq';
import DontMissAirdrop from '@/components/ui/DontMissAirdrop';
import { airdropData } from '@/static/uiData';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setAirdropLoading,
  setAirdropEvents,
  type AirdropType,
  type AirdropEventData,
  AirdropStatus,
} from '@/store/slices';
import { formatReward } from '@/lib/helpers';

interface ApiAirdropEvent {
  id: string;
  name: string;
  eventName?: string;
  reward: number;
  starts: string;
  ends: string;
  status: AirdropStatus;
  icon?: string;
  contract?: string;
  [key: string]: any;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export default function AirdropClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'HPP' | 'DApp' | 'Collaboration'>('HPP');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Get data from Redux
  const airdropState = useAppSelector((state) => state.airdrop);

  // Map API type to tab name
  const getApiType = (tab: 'HPP' | 'DApp' | 'Collaboration'): AirdropType => {
    switch (tab) {
      case 'HPP':
        return 'hpp';
      case 'DApp':
        return 'dapp';
      case 'Collaboration':
        return 'collaboration';
      default:
        return 'hpp';
    }
  };

  const apiType = useMemo(() => getApiType(activeTab), [activeTab]);
  const eventsData = airdropState.events[apiType];
  const isLoading = airdropState.loading[apiType];
  const lastFetched = airdropState.lastFetched[apiType];

  // Convert Redux data to AirdropEvent format (with icon)
  const airdropEvents = useMemo(() => {
    return eventsData.map((event: AirdropEventData) => ({
      ...event,
      icon: HPPTickerIcon,
    }));
  }, [eventsData]);

  const sortedAirdropEvents = useMemo(() => {
    const order: Record<string, number> = { 'On-Going': 0, 'Coming Soon': 1, Ended: 2 };
    return [...airdropEvents].sort((a, b) => {
      const wa = order[a.status] ?? 99;
      const wb = order[b.status] ?? 99;
      if (wa !== wb) return wa - wb;
      return String(a.name).localeCompare(String(b.name));
    });
  }, [airdropEvents]);

  const getDefaultExpandedId = (events: Array<Pick<AirdropEventData, 'id' | 'name' | 'status'>>) => {
    const order: Record<string, number> = { 'On-Going': 0, 'Coming Soon': 1, Ended: 2 };
    const sorted = [...events].sort((a, b) => {
      const wa = order[a.status] ?? 99;
      const wb = order[b.status] ?? 99;
      if (wa !== wb) return wa - wb;
      return String(a.name).localeCompare(String(b.name));
    });
    return sorted[0]?.id ?? null;
  };

  const toggleEvent = (eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  };

  // Fetch airdrop events from API (only if not cached or cache expired)
  useEffect(() => {
    const fetchAirdropEvents = async () => {
      // Check if we have cached data that's still valid
      const now = Date.now();
      if (lastFetched && now - lastFetched < CACHE_DURATION && eventsData.length > 0) {
        // Use cached data, set first event as expanded if available
        if (eventsData.length > 0 && !expandedEventId) {
          setExpandedEventId(getDefaultExpandedId(eventsData));
        }
        return;
      }

      // Clear expanded events when switching tabs
      setExpandedEventId(null);
      dispatch(setAirdropLoading({ type: apiType, loading: true }));

      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_STAKING_API_URL;
        if (!apiBaseUrl) {
          console.error('NEXT_PUBLIC_HPP_STAKING_API_URL is not set');
          dispatch(setAirdropLoading({ type: apiType, loading: false }));
          return;
        }

        const response = await axios.get(`${apiBaseUrl}/airdrop/type/${apiType}`, {
          headers: { accept: 'application/json' },
        });

        // Handle different response structures
        let apiEventsData: any[] = [];
        if (Array.isArray(response.data)) {
          apiEventsData = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          apiEventsData = response.data.data;
        } else if (response.data?.events && Array.isArray(response.data.events)) {
          apiEventsData = response.data.events;
        }

        // Map API response to Redux-friendly AirdropEventData format (store extra fields if present)
        const mappedEvents: AirdropEventData[] = apiEventsData.map((event: ApiAirdropEvent) => ({
          id: event.id,
          name: event.name || 'Unknown Event',
          eventName: event.eventName || event.name || 'HPP',
          reward: event.reward ?? 0,
          starts: event.starts ?? '-',
          ends: event.ends ?? '-',
          status: event.status ?? 'Coming Soon',
          // extended fields (optional)
          icon: event.icon,
          description: event.description,
          claimPeriodStart: event.claimPeriodStart,
          claimPeriodEnd: event.claimPeriodEnd,
          vestingPeriodStart: event.vestingPeriodStart,
          vestingPeriodEnd: event.vestingPeriodEnd,
          vestingDuration: event.vestingDuration,
          eligibilityDescription: event.eligibilityDescription,
          governanceVoteLink: (event as any).governanceVoteLink,
          governanceVoteText: (event as any).governanceVoteText,
          imageUrl: (event as any).imageUrl,
          contract: (event as any).contract,
        }));

        // Save to Redux
        dispatch(setAirdropEvents({ type: apiType, events: mappedEvents }));

        // Set first event as expanded if available
        if (mappedEvents.length > 0) {
          setExpandedEventId(getDefaultExpandedId(mappedEvents));
        } else {
          setExpandedEventId(null);
        }
      } catch (error) {
        console.error('Failed to fetch airdrop events:', error);
        // Set empty array on error
        dispatch(setAirdropEvents({ type: apiType, events: [] }));
        setExpandedEventId(null);
      }
    };

    fetchAirdropEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, apiType]);

  const getStatusClasses = (status: AirdropStatus) => {
    if (status === 'On-Going') return { dot: 'bg-[#5DF23F]', text: 'text-[#5DF23F]' };
    if (status === 'Coming Soon') return { dot: 'bg-[#F7EA94]', text: 'text-[#F7EA94]' };
    return { dot: 'bg-[#BFBFBF]', text: 'text-[#BFBFBF]' };
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
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? 'opacity-50 min-[1200px]:opacity-100' : ''
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
                className={`px-5 py-2.5 rounded-[23px] text-base font-normal transition-colors cursor-pointer ${
                  activeTab === 'HPP' ? 'bg-[#5DF23F] text-black' : 'bg-[#121212] text-white'
                }`}
              >
                HPP
              </button>
              <button
                onClick={() => setActiveTab('DApp')}
                className={`px-5 py-2.5 rounded-[23px] text-base font-normal transition-colors cursor-pointer ${
                  activeTab === 'DApp' ? 'bg-[#5DF23F] text-black' : 'bg-[#121212] text-white'
                }`}
              >
                DApp
              </button>
              <button
                onClick={() => setActiveTab('Collaboration')}
                className={`px-5 py-2.5 rounded-[23px] text-base font-normal transition-colors cursor-pointer ${
                  activeTab === 'Collaboration' ? 'bg-[#5DF23F] text-black' : 'bg-[#121212] text-white'
                }`}
              >
                Collaboration
              </button>
            </div>

            {/* Mobile/Tablet View (below 1200px) */}
            <div className="min-[1200px]:hidden">
              {isLoading ? (
                <div className="rounded-[5px] bg-[#121212] border border-[#2D2D2D] p-5 flex items-center justify-center">
                  <DotLottieReact
                    src="/lotties/Loading.lottie"
                    autoplay
                    loop
                    className="w-[60px] h-[60px]"
                    renderConfig={{
                      autoResize: true,
                      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2,
                      freezeOnOffscreen: true,
                    }}
                    layout={{ fit: 'contain', align: [0.5, 0.5] }}
                  />
                </div>
              ) : airdropEvents.length === 0 ? (
                <div className="rounded-[5px] bg-[#121212] border border-[#2D2D2D] p-5 flex items-center justify-center">
                  <p className="text-[#bfbfbf] text-base leading-[1]">Coming Soon+</p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <div className="px-5 py-5 rounded-[5px] bg-[#121212]">
                    <div className="text-[#bfbfbf] text-base font-semibold leading-[1]">Event</div>
                  </div>

                  {sortedAirdropEvents.map((event, idx) => {
                    const IconComponent = event.icon;
                    const isOpen = expandedEventId === event.id;
                    const isLast = idx === sortedAirdropEvents.length - 1;
                    return (
                      <div key={event.id}>
                        <button
                          type="button"
                          onClick={() => toggleEvent(event.id)}
                          className="w-full px-5 py-6 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors cursor-pointer text-left"
                          aria-expanded={isOpen}
                          aria-controls={`airdrop-mobile-panel-${event.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="w-5 h-5 text-white flex-shrink-0" />
                            <div className="flex flex-col gap-1">
                              <span className={`${getStatusClasses(event.status).text} text-sm leading-[1]`}>
                                {event.status}
                              </span>
                              <span className="text-white text-base font-semibold leading-[1]">{event.name}</span>
                            </div>
                          </div>
                          <span
                            className={`pointer-events-none inline-flex opacity-80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          >
                            <DownIcon className="w-5 h-5 text-white" />
                          </span>
                        </button>

                        <div
                          id={`airdrop-mobile-panel-${event.id}`}
                          className="grid overflow-hidden"
                          style={{
                            gridTemplateRows: isOpen ? '1fr' : '0fr',
                            transition: 'grid-template-rows 300ms ease, opacity 300ms ease',
                            opacity: isOpen ? 1 : 0,
                          }}
                          aria-hidden={!isOpen}
                        >
                          <div className="overflow-hidden">
                            <div className="pt-2 px-5 pb-6">
                              {/* Below 600px: 2-col (Event/Reward) + 3-col (Starts/Ends/Status) + button left-aligned */}
                              <div className="flex flex-col gap-4 text-left items-start min-[600px]:hidden">
                                <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1 text-left">
                                  <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Event</div>
                                  <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Reward</div>
                                  <div className="text-white text-base leading-[1]">{event.eventName}</div>
                                  <div className="text-white text-base leading-[1]">{`${formatReward(event.reward)}`}</div>
                                </div>
                                <div className="w-full grid grid-cols-3 gap-x-4 gap-y-1 text-left">
                                  <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Starts</div>
                                  <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Ends</div>
                                  <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Status</div>
                                  <div className="text-white text-base leading-[1]">{event.starts}</div>
                                  <div className="text-white text-base leading-[1]">{event.ends}</div>
                                  <div className="flex items-center gap-1.5 justify-start">
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full ${getStatusClasses(event.status).dot}`}
                                    ></span>
                                    <span
                                      className={`text-sm leading-[1] whitespace-nowrap ${getStatusClasses(event.status).text}`}
                                    >
                                      {event.status}
                                    </span>
                                  </div>
                                </div>
                                {event.status === 'On-Going' && (
                                  <div className="w-full flex justify-start pt-1">
                                    <Button
                                      variant="white"
                                      size="sm"
                                      className="cursor-pointer whitespace-nowrap font-semibold px-4 py-2 border border-white"
                                      onClick={() => router.push(`/airdrop/${event.id}`)}
                                    >
                                      Go to Claim
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* 600px and up: table grid */}
                              <div
                                className="hidden min-[600px]:grid gap-4 items-center"
                                style={{
                                  gridTemplateColumns: '1.2fr 1.8fr 1fr 1fr 1.2fr 140px',
                                  gridTemplateRows: 'auto auto',
                                }}
                              >
                                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Event</div>
                                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Reward</div>
                                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Starts</div>
                                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Ends</div>
                                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Status</div>
                                <div className="row-span-2 flex justify-end items-center">
                                  {event.status === 'On-Going' && (
                                    <Button
                                      variant="white"
                                      size="sm"
                                      className="cursor-pointer whitespace-nowrap font-semibold px-4 py-2"
                                      onClick={() => router.push(`/airdrop/${event.id}`)}
                                    >
                                      Go to Claim
                                    </Button>
                                  )}
                                </div>
                                <div className="text-white text-base leading-[1]">{event.eventName}</div>
                                <div className="text-white text-base leading-[1]">{`${formatReward(event.reward)}`}</div>
                                <div className="text-white text-base leading-[1]">{event.starts}</div>
                                <div className="text-white text-base leading-[1]">{event.ends}</div>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full ${getStatusClasses(event.status).dot}`}
                                  ></span>
                                  <span
                                    className={`text-sm leading-[1] whitespace-nowrap ${getStatusClasses(event.status).text}`}
                                  >
                                    {event.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop View (1200px+) - Table Style */}
            <div className="hidden min-[1200px]:block overflow-hidden bg-[#121212] rounded-[5px]">
              {/* Table Header */}
              <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr_auto] gap-4 px-5 py-4">
                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Event</div>
                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Reward</div>
                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Starts</div>
                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Ends</div>
                <div className="text-[#bfbfbf] text-base leading-[1] font-semibold">Status</div>
                <div></div>
              </div>

              {/* Table Content */}
              <div>
                {isLoading ? (
                  <div className="px-5 py-4 flex items-center justify-center">
                    <DotLottieReact
                      src="/lotties/Loading.lottie"
                      autoplay
                      loop
                      className="w-[60px] h-[60px]"
                      renderConfig={{
                        autoResize: true,
                        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2,
                        freezeOnOffscreen: true,
                      }}
                      layout={{ fit: 'contain', align: [0.5, 0.5] }}
                    />
                  </div>
                ) : airdropEvents.length === 0 ? (
                  <div className="px-5 py-4 flex items-center justify-center">
                    <p className="text-[#bfbfbf] text-base leading-[1]">Coming Soon</p>
                  </div>
                ) : (
                  sortedAirdropEvents.map((event) => {
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
                  })
                )}
              </div>
            </div>
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
