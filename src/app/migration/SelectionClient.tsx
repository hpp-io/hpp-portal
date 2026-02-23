'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Header from '@/components/ui/Header';
import { RightArrowIcon } from '@/assets/icons';
import Button from '@/components/ui/Button';
import AERGO from '@/assets/icons/AergoMS.png';
import AQT from '@/assets/icons/AQTMS.png';
import Sidebar from '@/components/ui/Sidebar';
import Footer from '@/components/ui/Footer';
import { navItems, legalLinks } from '@/config/navigation';
import { migrationData } from '@/static/uiData';
import NeedHelp from '@/components/ui/NeedHelp';
import { CheckIcon } from '@/assets/icons';
import FaqSection from '@/components/ui/Faq';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

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
          legalLinks={legalLinks}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? 'opacity-50 min-[1200px]:opacity-100' : ''
          }`}
        >
          <div className="py-12.5">
            <div className="px-5 max-w-6xl mx-auto">
              <div className="w-full flex justify-center">
                <DotLottieReact
                  src="/lotties/Migration.lottie"
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
                Choose Your Migration Path
              </h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-5xl text-center">
                Select the option that matches your current token holdings to migrate into the HPP Mainnet.
              </p>
            </div>
          </div>
          <div className="px-5 max-w-6xl mx-auto mt-20">
            <div className="grid grid-cols-1 min-[810px]:grid-cols-2 gap-5">
              <div className="rounded-[5px] px-5 py-7.5 bg-primary w-full flex flex-col">
                <div className="flex flex-col items-start flex-1">
                  <div className="w-12.5 h-12.5 bg-white rounded-lg flex items-center justify-center mb-5">
                    <Image src={AERGO} alt="AERGO" />
                  </div>
                  <h5 className="text-white text-xl font-semibold leading-[1.5]">AERGO Holder</h5>
                  <p className="text-white/90 text-base text-normal leading-[1.5] max-w-md mb-5.5">
                    I hold AERGO tokens on AERGO Mainnet or Ethereum.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5">
                      <CheckIcon className="w-4.5 h-4.5" />
                      <span className="text-white text-sm">AERGO on AERGO Mainnet</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <CheckIcon className="w-4.5 h-4.5" />
                      <span className="text-white text-sm">AERGO on Ethereum</span>
                    </div>
                  </div>
                </div>
                <div className="pt-6">
                  <Button
                    href="/migration/AERGO"
                    variant="white"
                    size="lg"
                    icon={<RightArrowIcon className="w-4 h-4 fill-current" />}
                    className="cursor-pointer"
                  >
                    Start AERGO Migration
                  </Button>
                </div>
              </div>

              <div className="rounded-[5px] px-5 py-7.5 bg-primary w-full lg:max-w-[520px] flex flex-col">
                <div className="flex flex-col items-start flex-1">
                  <div className="w-12.5 h-12.5 bg-white rounded-lg flex items-center justify-center mb-5">
                    <Image src={AQT} alt="AQT" />
                  </div>
                  <h5 className="text-white text-xl font-semibold leading-[1.5]">AQT Holder</h5>
                  <p className="text-white/90 text-base text-normal leading-[1.5] max-w-md mb-5.5">
                    I hold AQT tokens on Ethereum.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5">
                      <CheckIcon className="w-4.5 h-4.5" />
                      <span className="text-white text-sm">AQT on Ethereum</span>
                    </div>
                  </div>
                </div>
                <div className="pt-6">
                  <Button
                    href="/migration/AQT"
                    variant="white"
                    size="lg"
                    icon={<RightArrowIcon className="w-4 h-4 fill-current" />}
                    className="cursor-pointer"
                  >
                    Start AQT Migration
                  </Button>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <FaqSection
              title="FAQ: AERGO → HPP Migration"
              items={migrationData.faq}
              className="mt-12.5 min-[1200px]:mt-25 mb-20"
              data-faq-section
            />

            {/* Need Help Section */}
            <NeedHelp />
          </div>
          <div className="mt-25">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
