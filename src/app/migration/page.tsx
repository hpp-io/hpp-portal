'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import NeedHelp from '@/components/ui/NeedHelp';

export default function MigrationPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    {
      label: 'Home',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: 'Migration',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      label: 'Airdrop',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      label: 'Bridge',
      href: '#',
      external: true,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: 'Ecosystem',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      label: 'Governance',
      href: '#',
      external: true,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Build',
      href: '#',
      external: true,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
    },
    {
      label: 'Block Explorer',
      href: '#',
      external: true,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
    },
  ];

  const communityLinks = [
    { label: 'Terms of Service', href: '#' },
    { label: 'Privacy Policy', href: '#' },
  ];

  const migrationPaths = [
    {
      title: 'AERGO (Mainnet) → HPP (ETH)',
      description:
        'If you hold AERGO on the **AERGO mainnet**, use the official Aergo Bridge to migrate to HPP via Ethereum.',
      flow: [
        { name: 'AERGO', label: 'AERGO Mainnet' },
        { name: 'Aergo Bridge', label: '' },
        { name: 'HPP', label: 'HPP (ETH)' },
      ],
      buttons: [
        {
          text: 'Go to Aergo Bridge',
          variant: 'primary' as const,
          external: true,
          className: '',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          ),
        },
        {
          text: 'View Step-by-Step Guide',
          variant: 'outline' as const,
          className: '',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ),
        },
      ],
    },
  ];

  const completeMigration = {
    title: 'Complete Your Migration',
    description:
      'Once you have HPP tokens on Ethereum, bridge them to the native HPP network for full ecosystem access and benefits.',
    flow: [
      { name: 'HPP', label: 'Ethereum' },
      { name: 'Arbitrum Canonical Bridge', label: '' },
      { name: 'HPP', label: 'Native' },
    ],
    buttons: [
      {
        text: 'Go to Arbitrum Canonical Bridge',
        variant: 'primary' as const,
        external: true,
        className: '',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        ),
      },
    ],
  };

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
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/HPPMainnet_Logo.svg" alt="HPP Mainnet" className="w-8 h-8 filter brightness-0" />
              <span className="text-lg font-bold text-gray-900">HPP Portal</span>
            </div>
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Migrate to HPP</h1>
            <p className="text-lg text-gray-600 max-w-4xl">
              Move your AERGO tokens to the HPP Layer2 network using the appropriate migration path based on your source
              chain.
            </p>
          </div>

          {/* Migration Paths */}
          <div className="space-y-8">
            {/* AERGO (Mainnet) → HPP (ETH) - Step 1 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              {/* Header with Step Number */}
              <div className="flex items-start mb-6">
                <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-white font-semibold text-sm">1</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">AERGO (Mainnet) → HPP (ETH)</h2>
                  <p className="text-gray-600">
                    If you hold AERGO on the AERGO mainnet, use the official Aergo Bridge to migrate to HPP via
                    Ethereum.
                  </p>
                </div>
              </div>

              {/* Flow Diagram */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-white text-sm font-medium">AERGO</span>
                    </div>
                    <span className="text-xs text-gray-600 text-center">AERGO Mainnet</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <svg className="w-6 h-6 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-xs text-gray-600 text-center">Aergo Bridge</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-white text-sm font-medium">HPP</span>
                    </div>
                    <span className="text-xs text-gray-600 text-center">HPP (ETH)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Vertical Layout */}
              <div className="space-y-3">
                <Button variant="outline" size="sm" className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  <span>Go to Aergo Bridge</span>
                </Button>

                <Button variant="outline" size="sm" className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>View Step-by-Step Guide</span>
                </Button>
              </div>
            </div>

            {/* AERGO (ETH) → HPP (ETH) - Step 2 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              {/* Header with Step Number */}
              <div className="flex items-start mb-6">
                <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-white font-semibold text-sm">2</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">AERGO (ETH) → HPP (ETH)</h2>
                  <p className="text-gray-600">
                    If your AERGO tokens are already on Ethereum, use HPP's migration bridge to move them directly to
                    the HPP network.
                  </p>
                </div>
              </div>

              {/* Flow Diagram */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-white text-sm font-medium">AERGO</span>
                    </div>
                    <span className="text-xs text-gray-600 text-center">Ethereum</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <svg className="w-6 h-6 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-xs text-gray-600 text-center">HPP Bridge</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-white text-sm font-medium">HPP</span>
                    </div>
                    <span className="text-xs text-gray-600 text-center">HPP (ETH)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Vertical Layout */}
              <div className="space-y-3">
                <Button variant="outline" size="sm" className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>View Step-by-Step Guide</span>
                </Button>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span className="text-gray-700">Connect your wallet to start migration</span>
                    </div>
                    <Button variant="primary" size="sm" className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span>Connect Wallet</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Complete Your Migration Section */}
          <div className="mt-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Complete Your Migration</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Once you have HPP tokens on Ethereum, bridge them to the native HPP network for full ecosystem access
                and benefits.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm max-w-2xl mx-auto">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">HPP (ETH) → HPP Native</h3>
                <p className="text-gray-600 mb-6">
                  Use the Arbitrum Canonical Bridge to move your tokens to the native HPP network.
                </p>

                {/* Flow Diagram */}
                <div className="flex items-center justify-center mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-2">
                        <span className="text-white text-sm font-medium">HPP</span>
                      </div>
                      <span className="text-xs text-gray-600 text-center">Ethereum</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <svg className="w-6 h-6 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-xs text-gray-600 text-center">Arbitrum Canonical Bridge</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-2">
                        <span className="text-white text-sm font-medium">HPP</span>
                      </div>
                      <span className="text-xs text-gray-600 text-center">Native</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="text-center">
                  <Button variant="primary" size="md" className="flex items-center space-x-2 mx-auto">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    <span>Go to Arbitrum Canonical Bridge</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Need Help Section */}
          <NeedHelp />
        </div>
      </main>
    </div>
  );
}
