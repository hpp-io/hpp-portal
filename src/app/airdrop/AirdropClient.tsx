'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import MobileHeader from '@/components/ui/MobileHeader';
import { navItems, communityLinks } from '@/config/navigation';

export default function AirdropClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white overflow-x-hidden" style={{ width: '100vw', maxWidth: '100vw' }}>
      <Sidebar
        navItems={navItems}
        communityLinks={communityLinks}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
          sidebarOpen ? 'opacity-50 lg:opacity-100' : ''
        }`}
      >
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex items-center justify-center min-h-screen p-4" style={{ width: '100%', maxWidth: '100%' }}>
          <div className="text-center max-w-md mx-auto">
            {/* Gift Icon */}
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                />
              </svg>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl font-medium text-black mb-4">Airdrop Coming Soon</h1>

            {/* Body Text */}
            <p className="text-gray-700 text-sm leading-relaxed mb-8">
              We're preparing something special for our
              <br />
              community. Stay tuned for updates on the HPP
              <br />
              token airdrop.
            </p>

            {/* Button */}
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors text-sm whitespace-nowrap">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              <span>Launching Soon</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
