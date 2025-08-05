'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';

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
      href: '#',
      external: true,
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
      title: 'Aergo (Mainnet) → HPP (Ethereum)',
      description:
        'If you hold AERGO on the Aergo mainnet, use the official Aergo Bridge to migrate to HPP via Ethereum.',
      flow: [
        { name: 'AERGO (Aergo Mainnet)', icon: '🔗' },
        { name: 'Aergo Bridge', icon: '🌉' },
        { name: 'ETH (Ethereum)', icon: '⚡' },
        { name: 'HPP Bridge', icon: '🌉' },
        { name: 'HPP (HPP Layer2)', icon: '🚀' },
      ],
      buttons: [
        {
          text: 'Go to Aergo Bridge',
          variant: 'primary' as const,
          external: true,
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
    {
      title: 'AERGO (Ethereum) → HPP (Ethereum)',
      description:
        "If your AERGO tokens are already on Ethereum, use HPP's migration bridge to move them directly to the HPP network.",
      flow: [
        { name: 'AERGO (Ethereum)', icon: '⚡' },
        { name: 'HPP Bridge', icon: '🌉' },
        { name: 'HPP (HPP Layer2)', icon: '🚀' },
      ],
      buttons: [
        {
          text: 'Go to HPP Bridge',
          variant: 'primary' as const,
          external: true,
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
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">HPP</span>
              </div>
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
            {migrationPaths.map((path, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{path.title}</h2>
                  <p className="text-gray-600 mb-6">{path.description}</p>

                  {/* Flow Diagram */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="flex items-center space-x-4">
                      {path.flow.map((step, stepIndex) => (
                        <React.Fragment key={stepIndex}>
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                              <span className="text-lg">{step.icon}</span>
                            </div>
                            <span className="text-xs text-gray-600 text-center max-w-20">{step.name}</span>
                          </div>
                          {stepIndex < path.flow.length - 1 && (
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {path.buttons.map((button, buttonIndex) => (
                      <Button
                        key={buttonIndex}
                        variant={button.variant}
                        size="md"
                        className="flex items-center space-x-2"
                      >
                        {button.icon}
                        <span>{button.text}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Help Section */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                If you're unsure about which migration path to use or need assistance, our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" size="md" className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c0-.438-.199-1.105-.568-1.802C7.354 6.374 6.299 6 5 6c-1.299 0-2.354.374-2.66 1.198C1.771 7.895 1.572 8.562 1.572 9c0 .438.199 1.105.568 1.802C2.646 11.626 3.701 12 5 12c1.299 0 2.354-.374 2.66-1.198C8.229 9.895 8.428 9.228 8.428 9zM15.228 9c0-.438-.199-1.105-.568-1.802C14.354 6.374 13.299 6 12 6c-1.299 0-2.354.374-2.66 1.198C8.771 7.895 8.572 8.562 8.572 9c0 .438.199 1.105.568 1.802C9.646 11.626 10.701 12 12 12c1.299 0 2.354-.374 2.66-1.198C15.229 9.895 15.428 9.228 15.428 9z"
                    />
                  </svg>
                  <span>FAQ</span>
                </Button>
                <Button variant="outline" size="md" className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z"
                    />
                  </svg>
                  <span>Contact Support</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
