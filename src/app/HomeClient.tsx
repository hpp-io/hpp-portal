'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import MobileHeader from '@/components/ui/MobileHeader';
import { navItems, communityLinks } from '@/config/navigation';
import { homeData } from '@/static/uiData';

export default function HomeClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="flex h-screen bg-white overflow-x-hidden">
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

        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          <div className="lg:max-w-full 2xl:max-w-[80%] mx-auto">
            {/* Welcome Section */}
            <div className="mb-16">
              <div className="flex items-center mb-4">
                <h1 className="text-4xl font-medium text-gray-900">Welcome to HPP Portal</h1>
              </div>
              <p className="text-lg text-gray-700 max-w-4xl">
                Welcome to the HPP Portal, where you can migrate your assets, bridge across networks, and start building
                on AI-native Layer 2 infrastructure.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-16">
              <h2 className="text-2xl font-medium text-gray-900 mb-8">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                {homeData.quickActions.map((action, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow w-full lg:max-w-[400px]"
                  >
                    <div className="text-gray-800 mb-4">{action.icon}</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{action.title}</h3>
                    <p className="text-gray-700">{action.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ecosystem Highlights */}
            <div className="mb-16">
              <h2 className="text-2xl font-medium text-gray-900 mb-8">Ecosystem Highlights</h2>
              <p className="text-lg text-gray-700 mb-6 max-w-4xl">
                Explore leading dApps, AI agents, and on-chain services driving innovation on the HPP Mainnet.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 justify-items-center">
                {homeData.ecosystemProjects.map((project, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow w-full lg:max-w-[400px]"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {project.icon}
                      </div>
                      <h3 className="text-lg font-normal text-gray-900">{project.name}</h3>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{project.description}</p>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push('/ecosystem')}
                  className="cursor-pointer whitespace-nowrap"
                >
                  Explore All
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
