'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';
import Footer from '@/components/ui/Footer';
import { navItems, communityLinks } from '@/config/navigation';

export default function SelectionClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div className="bg-[#121212] border-b border-[#161616] py-7.5">
            <div className="px-4 max-w-6xl mx-auto">
              <h1 className="text-[50px] min-[1200px]:text-[70px] leading-[1.5] font-[900] text-white">
                Migration Test
              </h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-5xl">
                Select the token you want to migrate to HPP.
              </p>
            </div>
          </div>
          <div className="px-4 max-w-6xl mx-auto mt-12.5 min-[1200px]:mt-25">
            <h2 className="text-3xl leading-[1.5] font-[900] text-white mb-5">Choose Token</h2>
            <div className="grid grid-cols-1 min-[810px]:grid-cols-2 gap-5 justify-items-center">
              <Link
                href="/migration/test/AERGO"
                className="relative rounded-[5px] p-6 border border-transparent bg-primary w-full lg:max-w-[520px]"
              >
                <div className="mb-3 flex justify-center">
                  <DotLottieReact
                    src="/lotties/Migration.lottie"
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
                <h5 className="text-lg font-semibold leading-[1.5] text-white mb-2.5">AERGO (ERC-20) → HPP (ERC-20)</h5>
                <p className="text-white leading-[1.5] font-normal tracking-[0.6px]">
                  Migrate AERGO on Ethereum to HPP.
                </p>
                <div className="absolute bottom-5 right-5">
                  <svg className="w-[22px] h-[22px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                </div>
              </Link>
              <Link
                href="/migration/test/AQT"
                className="relative rounded-[5px] p-6 border border-transparent bg-primary w-full lg:max-w-[520px]"
              >
                <div className="mb-3 flex justify-center">
                  <DotLottieReact
                    src="/lotties/Migration.lottie"
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
                <h5 className="text-lg font-semibold leading-[1.5] text-white mb-2.5">AQT (ERC-20) → HPP (ERC-20)</h5>
                <p className="text-white leading-[1.5] font-normal tracking-[0.6px]">Migrate AQT on Ethereum to HPP.</p>
                <div className="absolute bottom-5 right-5">
                  <svg className="w-[22px] h-[22px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                </div>
              </Link>
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
