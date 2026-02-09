'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Button from '@/components/ui/Button';
import { ClockIcon } from '@/assets/icons';
import { navItems, legalLinks } from '@/config/navigation';

export default function AirdropClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div className="flex items-center justify-center p-6 bg-black min-h-[calc(100vh-66px)] min-[1200px]:min-h-[calc(100vh-85px)]">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-[50px] leading-[1.5em] font-extrabold text-white mb">
                Airdrop <br className="hidden max-[810px]:inline" /> Coming Soon
              </h1>
              <p className="text-lg leading-[1.5em] font-semibold text-[#bfbfbf]">
                Rewards for our community are on the horizon.
              </p>
              <p className="text-lg leading-[1.5em] font-semibold mb-5 text-[#bfbfbf]">
                Your contribution matters. Your rewards are coming.
              </p>
              <Button
                variant="primary"
                size="md"
                className="rounded-full px-5 py-3"
                icon={<ClockIcon className="w-5 h-5" />}
                noPointer
              >
                Launching Soon
              </Button>
            </div>
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}