'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { navItems, legalLinks } from '@/config/navigation';
import { homeData } from '@/static/uiData';
import { formatRemaining } from '@/lib/helpers';
import Image from 'next/image';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import axios from 'axios';
import dayjs from '@/lib/dayjs';

export default function HomeClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Pre-registration countdown (initialize from base API)
  const [preRemainingSec, setPreRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const init = async () => {
      // Fetch preRegistrationDate from base API
      let endAt: ReturnType<typeof dayjs> | null = null;
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_STAKING_API_URL;
        const resp = await axios.get(`${apiBaseUrl}/pre-registration/base`, {
          headers: { accept: 'application/json' },
        });
        const data: any = resp?.data ?? {};
        const s: string | undefined = data?.data?.preRegistrationDate;
        if (s && typeof s === 'string') {
          let d = dayjs(s);
          if (!d.isValid()) d = dayjs(s.replace(' ', 'T'));
          if (!d.isValid()) d = dayjs(`${s.replace(' ', 'T')}Z`);
          endAt = d.isValid() ? d : null;
        }
      } catch {}
      if (!endAt || !endAt.isValid()) return;
      const calc = () => Math.max(0, endAt!.diff(dayjs(), 'second'));
      if (cancelled) return;
      const first = calc();
      setPreRemainingSec(first);
      if (first === 0) return;
      intervalId = setInterval(() => {
        if (cancelled) return;
        const next = calc();
        setPreRemainingSec(next);
        if (next === 0 && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 1000);
    };
    void init();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Quick Actions now rely on href provided in uiData.quickActions

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
          {/* Hero Section */}
          <div className="py-12.5">
            <div className="px-5 max-w-6xl mx-auto">
              <h1 className="text-[50px] min-[1200px]:text-[70px] leading-[1.5] font-[900] text-white text-center">
                Welcome to <span className="inline max-[599px]:block">HPP Portal</span>
              </h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-7xl text-center">
                Welcome to the HPP Portal, where you can migrate your assets, bridge across networks, and start building
                on AI-native Layer 2 infrastructure.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-5 max-w-6xl mx-auto mt-20">
            <h2 className="text-3xl leading-[1.5] font-[900] text-white mb-5">Quick Actions</h2>
            {/* Pre-Registration banner (1-col full width) */}
            {(() => {
              const pre = (homeData.quickActions as any[]).find((a) => a.title === 'Pre-Registration');
              if (!pre) return null;
              
              // Loading state
              if (preRemainingSec === null) {
                return (
                  <div className="mb-5">
                    <div className="rounded-[5px] p-6 min-[1200px]:p-8 bg-[#4b4ab0] text-white flex flex-col items-center justify-center">
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
                  </div>
                );
              }
              
              const href: string | undefined = preRemainingSec === 0 ? pre.openHref : pre.href;
              const external = href ? /^https?:\/\//.test(href) : false;
              return (
                <div className="mb-5">
                  <div className="rounded-[5px] p-6 min-[1200px]:p-8 bg-[#4b4ab0] text-white flex flex-col items-center justify-center text-center min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between min-[600px]:text-left">
                    <DotLottieReact
                      src="/lotties/Staking.lottie"
                      autoplay
                      loop
                      className="w-[120px] h-[120px]"
                      renderConfig={{
                        autoResize: true,
                        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2,
                        freezeOnOffscreen: true,
                      }}
                      layout={{ fit: 'contain', align: [0.5, 0.5] }}
                    />
                    <div className="mt-3 min-[600px]:mt-0 min-[600px]:ml-2.5 text-left flex-1 self-center">
                      <div className="mb-2 flex justify-start">
                        <span className="inline-flex items-center gap-2 bg-white text-black rounded-[5px] px-2.5 py-1.25 text-sm font-semibold leading-[1]">
                          <span>🔥</span>
                          <span>Up to 20% APR</span>
                        </span>
                      </div>
                      <div className="flex gap-3 justify-start">
                        <h3 className="text-3xl font-[900] leading-[1.2]">
                          HPP Staking{' '}
                          {preRemainingSec === 0 ? (
                            <>
                              <br className="hidden max-[900px]:block" />
                              <span className="text-[#5DF23F] whitespace-nowrap inline">
                                Season 1
                              </span>
                              {' '}
                              <span className="text-white whitespace-nowrap inline">
                                is now open!
                              </span>
                            </>
                          ) : (
                          <span className="text-[#5DF23F] whitespace-nowrap inline max-[600px]:block max-[600px]:mt-1">
                            Pre-Registration
                          </span>
                          )}
                        </h3>
                      </div>
                      <p className="text-base text-white font-normal leading-[1.2] mt-2.5">
                        <span>{preRemainingSec === 0 ? pre.openDescription : pre.description} </span>
                        {preRemainingSec !== null && preRemainingSec !== 0 && (
                          <span className="text-[#5DF23F] inline whitespace-nowrap max-[600px]:block max-[600px]:mt-1">
                            {formatRemaining(preRemainingSec)}
                          </span>
                        )}
                      </p>
                      {href && (
                        <div className="mt-4 self-center hidden max-[810px]:block max-[599px]:flex max-[599px]:justify-center max-[599px]:ml-0">
                          <Button variant="black" size="md" href={href} external={external} className="cursor-pointer">
                            {preRemainingSec === 0 ? 'Go to Stake' : 'Register Now'}
                          </Button>
                        </div>
                      )}
                    </div>
                    {href && (
                      <div className="mt-4 self-center hidden min-[810px]:block min-[810px]:mt-0 min-[810px]:ml-6">
                        <Button variant="black" size="md" href={href} external={external} className="cursor-pointer">
                          {preRemainingSec === 0 ? 'Go to Stake' : 'Register Now'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 min-[810px]:grid-cols-3 gap-5 justify-items-center">
              {(homeData.quickActions as any[])
                .filter((a) => a.title !== 'Pre-Registration')
                .map((action: any, index) => {
                  const href: string | undefined = action.href;
                  const external = href ? /^https?:\/\//.test(href) : false;
                  const lottieSrc =
                    action.title === 'Migration'
                      ? '/lotties/Migration.lottie'
                      : action.title === 'Bridge'
                      ? '/lotties/Bridge.lottie'
                      : '/lotties/StartBuilding.lottie';

                  const CardContent = (
                    <>
                      <div className="mb-3 flex justify-center">
                        <DotLottieReact
                          src={lottieSrc}
                          autoplay
                          loop
                          className="w-[120px] h-[120px]"
                          renderConfig={{
                            autoResize: true,
                            devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2,
                            freezeOnOffscreen: true,
                          }}
                          layout={{ fit: 'contain', align: [0.5, 0.5] }}
                        />
                      </div>
                      <h5 className="text-lg font-semibold leading-[1.5] text-white mb-2.5">{action.title}</h5>
                      <p className="text-white leading-[1.5] font-normal tracking-[0.6px]">{action.description}</p>
                      <div className="absolute bottom-5 right-5">
                        <svg
                          className="w-[22px] h-[22px] text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5-5 5M6 12h12"
                          />
                        </svg>
                      </div>
                    </>
                  );

                  if (href) {
                    return external ? (
                      <a
                        key={index}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block rounded-[5px] p-6 pb-10 border border-transparent bg-primary w-full lg:max-w-[400px] transition-transform duration-200 hover:opacity-95"
                      >
                        {CardContent}
                      </a>
                    ) : (
                      <Link
                        key={index}
                        href={href}
                        className="relative block rounded-[5px] p-6 pb-10 border border-transparent bg-primary w-full lg:max-w-[400px] transition-transform duration-200 hover:opacity-95"
                      >
                        {CardContent}
                      </Link>
                    );
                  }
                  return (
                    <div
                      key={index}
                      className="relative block rounded-[5px] p-6 pb-10 border border-transparent bg-primary w-full lg:max-w-[400px]"
                    >
                      {CardContent}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Ecosystem Highlights */}
          <div className="px-5 max-w-6xl mx-auto mt-25">
            <h2 className="text-3xl leading-[1.5] font-[900] text-white">Ecosystem Highlights</h2>
            <p className="text-xl leading-[1.5] font-semibold text-[#bfbfbf] max-w-4xl">
              Explore leading dApps, AI agents, and on-chain services driving innovation on the HPP Mainnet.
            </p>
            <div className="my-5">
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/ecosystem')}
                className="cursor-pointer whitespace-nowrap bg-[#5651d8] border-0"
              >
                Explore More
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 justify-items-center">
              {homeData.ecosystemProjects.map((project, index) => {
                const Card = (
                  <div className="rounded-[5px] px-5 py-7.5 bg-[#111111] w-full lg:max-w-[400px] h-full flex flex-col transition-colors duration-200 group-hover:bg-[#161616]">
                    <div className="flex items-center space-x-2.5 mb-2.5">
                      <div className="w-8 h-8 bg-[#1f2937] rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        <Image src={project.icon} alt={project.name} width={22} height={22} />
                      </div>
                      <h5 className="text-lg leading-[1.5] font-semibold text-white">{project.name}</h5>
                    </div>
                    <p className="text-gray-300 text-base leading-[1.5]">{project.description}</p>
                  </div>
                );
                return project.link ? (
                  <a
                    key={index}
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full lg:max-w-[400px] h-full cursor-pointer group transition-transform duration-200"
                  >
                    {Card}
                  </a>
                ) : (
                  <div key={index} className="w-full lg:max-w-[400px] h-full">
                    {Card}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-25">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
