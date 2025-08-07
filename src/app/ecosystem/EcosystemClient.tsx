'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import MobileHeader from '@/components/ui/MobileHeader';
import { navItems, communityLinks } from '@/config/navigation';
import { ecosystemData } from '@/static/uiData';

export default function EcosystemClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

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

        <div className="p-4 lg:p-8 max-w-6xl mx-auto" style={{ width: '100%', maxWidth: '100%' }}>
          <div className="lg:max-w-full 2xl:max-w-[80%] mx-auto">
            {/* HPP Ecosystem Introduction */}
            <div className="mb-16">
              <div className="flex items-center mb-4">
                <h1 className="text-4xl font-medium text-gray-900">HPP Ecosystem</h1>
              </div>
              <p className="text-lg text-gray-700 max-w-4xl">
                The HPP Ecosystem is an AI-native infrastructure designed for the full data lifecycle, uniting
                intelligent agents, verifiable off-chain computation, and decentralized applications.
              </p>
            </div>

            {/* Featured Partners */}
            <div className="mb-16">
              <h2 className="text-2xl font-medium text-gray-900 mb-8">Featured Partners</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                {ecosystemData.featuredPartners.map((partner, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow w-full lg:max-w-[400px]"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {partner.icon}
                      </div>
                      <h3 className="text-lg font-normal text-gray-900">{partner.name}</h3>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{partner.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Build on HPP Section */}
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-medium text-gray-900 mb-4">Build on HPP</h2>
              <p className="text-lg text-gray-700">Join our growing ecosystem of partners</p>
            </div>

            {/* Why Build on HPP & Get Started */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Why Build on HPP */}
              <div>
                <h3 className="text-2xl font-medium text-gray-900 mb-6">Why Build on HPP?</h3>
                <div className="space-y-4">
                  {ecosystemData.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start space-x-1.5">
                      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-black">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-gray-700">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Get Started */}
              <div className="bg-white rounded-sm p-6 border border-gray-200 lg:-mt-9">
                <h3 className="text-2xl font-medium text-gray-900 mb-6">Get Started</h3>
                <div className="space-y-4">
                  <Button variant="primary" size="lg" className="w-full whitespace-nowrap">
                    Apply for Partnership
                  </Button>
                  <Button variant="outline" size="lg" className="w-full whitespace-nowrap">
                    View Documentation
                  </Button>
                  <Button variant="outline" size="lg" className="w-full whitespace-nowrap">
                    Join Telegram
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
