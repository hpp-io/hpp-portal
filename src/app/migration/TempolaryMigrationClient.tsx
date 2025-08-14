'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import { ClockIcon } from '@/assets/icons';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { navItems, communityLinks } from '@/config/navigation';

export default function TempolaryMigrationClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-black overflow-x-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />

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
          <div className="flex items-center justify-center p-6 bg-black min-h-[calc(100vh-66px)] min-[1200px]:min-h-[calc(100vh-85px)]">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-[50px] leading-[1.5em] font-[900] text-white">
                Migration <br className="hidden max-[810px]:inline" /> Coming Soon
              </h1>
              <p className="text-lg leading-[1.5em] font-semibold text-[#bfbfbf]">
                The next chapter for our ecosystem is almost here.
              </p>
              <p className="text-lg leading-[1.5em] mb-5 font-semibold text-[#bfbfbf]">
                Get ready to swap, connect, and explore a new era of AI-native, multi-chain possibilities.
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
