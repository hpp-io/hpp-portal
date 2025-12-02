'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { navItems, communityLinks } from '@/config/navigation';
import { ARB, Orbiter } from '@/assets/icons';
import { bridgeData } from '@/static/uiData';
import FaqSection from '@/components/ui/Faq';
import { useHppChain } from '@/app/staking/hppClient';

export default function BridgeClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { id: HPP_CHAIN_ID } = useHppChain();
  const arbitrumBridgeHref =
    HPP_CHAIN_ID === 190415
      ? 'https://bridge.arbitrum.io/?destinationChain=190415&sourceChain=ethereum&token=0xe33fbe7584eb79e2673abe576b7ac8c0de62565c'
      : 'https://portal.arbitrum.io/bridge?destinationChain=hpp-sepolia&sanitized=true&sourceChain=sepolia&tab=bridge&token=0xb34e0d1fee60e078d611d4218afb004b639c7b76';

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
              <h1 className="text-[50px] leading-[1.5] font-[900] text-white text-center">Bridge</h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-5xl text-center">
                HPP Bridge enables seamless and secure token transfers across multiple networks, ensuring
                interoperability within the HPP ecosystem.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 max-w-6xl mx-auto mt-12.5 min-[1200px]:mt-25">
            {/* Bridge Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Arbitrum Official Bridge */}
              <div className="rounded-[5px] p-6 bg-primary flex flex-col">
                <div className="flex flex-col items-start gap-2.5 flex-1">
                  <Image src={ARB} alt="Arbitrum" width={30} height={30} />
                  <h3 className="text-white text-xl font-semibold leading-[1.5]">Arbitrum Official Bridge</h3>
                  <p className="text-white/90 text-base text-normal leading-[1.5] max-w-md">
                    The most secure way to transfer assets between Ethereum and Arbitrum, ideal for high-value or
                    long-term holdings.
                  </p>
                </div>
                <div className="pt-6">
                  <Button variant="white" size="lg" href={arbitrumBridgeHref} external className="cursor-pointer">
                    Go to Bridge
                  </Button>
                </div>
              </div>

              {/* Orbiter Bridge */}
              <div className="rounded-[5px] p-6 bg-primary flex flex-col">
                <div className="flex flex-col items-start gap-2.5 flex-1">
                  <Image src={Orbiter} alt="Orbiter" width={30} height={30} />
                  <h3 className="text-white text-xl font-semibold leading-[1.5]">Orbiter Bridge</h3>
                  <p className="text-white/90 text-base text-normal leading-[1.5] max-w-md">
                    A fast, low-cost solution for moving assets, ideal for quick transfers and multi-chain activity.
                  </p>
                </div>
                <div className="pt-6">
                  <Button
                    variant="white"
                    size="lg"
                    href="https://www.orbiter.finance/bridge/Ethereum/HPP?token=ETH"
                    external
                    className="cursor-pointer"
                  >
                    Go to Bridge
                  </Button>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] mt-10 min-[1200px]:mt-5 mb-25 min-[1200px]:mb-50">
              These are independent third-party services that HPP links to for your convenience. HPP is not responsible
              for their operations, security, or any potential loss incurred when using them.
            </p>

            {/* FAQ */}
            <FaqSection items={bridgeData.faq} className="mb-20" />
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
