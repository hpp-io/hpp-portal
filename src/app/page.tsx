'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import MobileHeader from '@/components/ui/MobileHeader';
import { navItems, communityLinks } from '@/config/navigation';

export default function Home() {
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to HPP Portal</h1>
            <p className="text-lg text-gray-600 mb-8 max-w-3xl">
              Welcome to the HPP Portal, where you can migrate your assets, bridge across networks, and start building
              on AI-native Layer 2 infrastructure.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickActions.map((action, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6">
                  <div className="text-gray-800 mb-4">{action.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                  <p className="text-gray-600">{action.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ecosystem Highlights */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ecosystem Highlights</h2>
            <p className="text-lg text-gray-600 mb-6 max-w-3xl">
              Explore leading dApps, AI agents, and on-chain services driving innovation on the HPP Mainnet.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {ecosystemProjects.map((project, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6">
                  <div className="text-gray-800 mb-4">{project.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
                  <p className="text-gray-600">{project.description}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button variant="primary" size="lg" onClick={() => router.push('/ecosystem')} className="cursor-pointer">
                Explore
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export const quickActions = [
  {
    title: 'Migration',
    description: 'Swap your legacy AERGO tokens to HPP and join the new AI-native ecosystem',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    title: 'Bridge',
    description: 'Move assets seamlessly between Ethereum and HPP Mainnet',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: 'Start Building',
    description: 'Access tools, docs, and SDKs to launch AI-integrated smart contracts and autonomous agents on HPP.',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
];

export const ecosystemProjects = [
  {
    name: 'Aergo',
    description: 'Legacy hybrid infrastructure at the core of HPP, now transitioning into an AI-native foundation.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
  {
    name: 'AQT (Alpha Quark)',
    description: 'RWA and NFT valuation layer enabling AI-driven asset discovery, pricing, and strategy execution.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
  {
    name: 'BOOOST',
    description: 'Personhood verification and Sybil resistance powered by AI-based deepfake detection and biometrics.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
  {
    name: 'W3DB',
    description:
      'Model and data verification layer with staking-based validation for AI training, inference, and trust.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
  {
    name: 'ArenAI',
    description:
      'A crypto asset management portal that combines AI agents, CEX/DEX integration, and natural language strategy execution across DeFi.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
  {
    name: 'Noosphere',
    description:
      'A verifiable intelligence layer that enables smart contracts to delegate AI tasks — from inference to simulation — with secure off-chain computation and result verification.',
    icon: <div className="w-6 h-6 bg-gray-800 rounded"></div>,
  },
];
