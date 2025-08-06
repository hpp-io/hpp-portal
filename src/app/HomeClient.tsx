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
    <div className="flex h-screen bg-white">
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

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-12">
            <h1 className="text-4xl font-medium text-gray-900 mb-4">Welcome to HPP Portal</h1>
            <p className="text-lg text-gray-600 mb-8 max-w-3xl">
              Welcome to the HPP Portal, where you can migrate your assets, bridge across networks, and start building
              on AI-native Layer 2 infrastructure.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {homeData.quickActions.map((action, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6">
                  <div className="text-gray-800 mb-4">{action.icon}</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{action.title}</h3>
                  <p className="text-gray-600">{action.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ecosystem Highlights */}
          <div className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">Ecosystem Highlights</h2>
            <p className="text-lg text-gray-600 mb-6 max-w-3xl">
              Explore leading dApps, AI agents, and on-chain services driving innovation on the HPP Mainnet.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {homeData.ecosystemProjects.map((project, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center mb-2">
                    <div className="text-gray-800">{project.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-2">{project.name}</h3>
                  </div>
                  <p className="text-gray-600">{project.description}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button variant="primary" size="lg" onClick={() => router.push('/ecosystem')} className="cursor-pointer">
                Explore All
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
