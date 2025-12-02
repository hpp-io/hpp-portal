'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { navItems, communityLinks } from '@/config/navigation';
import { homeData } from '@/static/uiData';
import { formatRemaining } from '@/lib/helpers';
import Image from 'next/image';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function HomeClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Pre-registration countdown (reads NEXT_PUBLIC_PRE_REG_END; supports epoch seconds/ms or ISO)
  // Falls back to 30 days from now if not provided
  const [preRemainingSec, setPreRemainingSec] = useState<number | null>(null);
  const preRegEndRaw = process.env.NEXT_PUBLIC_PRE_REG_END as string | undefined;

  useEffect(() => {
    // Determine end time: env value or fallback 30 days from now
    let endMs: number | null = null;
    if (preRegEndRaw && preRegEndRaw.trim()) {
      const trimmed = preRegEndRaw.trim();
      if (/^\d+$/.test(trimmed)) {
        // digits only → epoch seconds or ms
        endMs = trimmed.length > 12 ? Number(trimmed) : Number(trimmed) * 1000;
      } else {
        const parsed = Date.parse(trimmed);
        endMs = Number.isFinite(parsed) ? parsed : null;
      }
    } else {
      endMs = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days fallback
    }
    if (!endMs || !Number.isFinite(endMs)) return;

    const calc = () => Math.max(0, Math.floor(endMs! / 1000 - Date.now() / 1000));
    setPreRemainingSec(calc());
    const id = setInterval(() => setPreRemainingSec(calc()), 1000);
    return () => clearInterval(id);
  }, [preRegEndRaw]);

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
          communityLinks={communityLinks}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? 'opacity-50 min-[1200px]:opacity-100' : ''
          }`}
        >
          {/* Hero Section */}
          <div className="bg-[#121212] border-b border-[#161616] py-7.5">
            <div className="px-4 max-w-6xl mx-auto">
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
          <div className="px-4 max-w-6xl mx-auto mt-12.5 min-[1200px]:mt-25">
            <h2 className="text-3xl leading-[1.5] font-[900] text-white mb-5">Quick Actions</h2>
            {/* Pre-Registration banner (1-col full width) */}
            {(() => {
              const pre = (homeData.quickActions as any[]).find((a) => a.title === 'Pre-Registration');
              if (!pre) return null;
              const href: string | undefined = pre.href;
              const external = href ? /^https?:\/\//.test(href) : false;
              return (
                <div className="mb-5">
                  <div className="rounded-[5px] p-6 min-[1200px]:p-8 bg-[#4b4ab0] text-white flex flex-col items-center justify-center text-center min-[810px]:flex-row min-[810px]:items-center min-[810px]:justify-between min-[810px]:text-left">
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
                    <div className="mt-3 text-center min-[810px]:mt-0 min-[810px]:ml-2.5 min-[810px]:text-left flex-1">
                      <div className="mb-2 flex justify-center min-[810px]:justify-start">
                        <span className="inline-flex items-center gap-2 bg-white text-black rounded-[5px] px-2.5 py-1.25 text-sm font-semibold leading-[1]">
                          <span>🔥</span>
                          <span>Up to 20% APR</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 justify-center min-[810px]:justify-start">
                        <h3 className="text-3xl font-[900] leading-[1.2]">
                          HPP Staking{' '}
                          <span className="text-[#5DF23F] whitespace-nowrap inline max-[599px]:block max-[599px]:mt-1">
                            Pre-Registration
                          </span>
                        </h3>
                      </div>
                      <p className="text-base text-white font-normal leading-[1.2] mt-2.5">
                        <span className="whitespace-nowrap">{pre.description} </span>
                        {preRemainingSec !== null && (
                          <span className="text-[#5DF23F] inline max-[599px]:block max-[599px]:mt-1">
                            {formatRemaining(preRemainingSec)}
                          </span>
                        )}
                      </p>
                    </div>
                    {href && (
                      <div className="mt-4 self-center min-[810px]:mt-0 min-[810px]:ml-6">
                        <Button variant="black" size="md" href={href} external={external} className="cursor-pointer">
                          Register Now
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
          <div className="px-4 max-w-6xl mx-auto mt-25">
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
