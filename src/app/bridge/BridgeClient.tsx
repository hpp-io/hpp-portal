'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import NeedHelp from '@/components/ui/NeedHelp';
import MobileHeader from '@/components/ui/MobileHeader';
import { navItems, communityLinks } from '@/config/navigation';

export default function BridgeClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqData = [
    {
      id: 1,
      question: 'What is a bridge?',
      answer:
        'A bridge allows you to transfer tokens between different blockchain networks, enabling interoperability across ecosystems.',
    },
    {
      id: 2,
      question: 'Which bridge should I use?',
      answer: 'For fast transfers, use Orbiter. For maximum security and lower fees, use the official Arbitrum bridge.',
    },
    {
      id: 3,
      question: 'Are there any risks?',
      answer:
        'Third-party bridges carry smart contract risks. Official bridges are generally safer but may take longer.',
    },
    {
      id: 4,
      question: 'What tokens are supported?',
      answer: 'Both bridges support ETH and major ERC-20 tokens. Check each bridge for specific token availability.',
    },
  ];

  const toggleFaq = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

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
            {/* Header Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-medium text-gray-900 mb-3">Bridge</h1>
              <p className="text-gray-700 text-lg">Transfer tokens across different networks</p>
            </div>

            {/* Bridge Options Section */}
            <div className="space-y-4 mb-8">
              {/* Arbitrum Bridge Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl font-bold">A</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Arbitrum</h3>
                      <p className="text-gray-600">Official secure bridge</p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    href="https://bridge.arbitrum.io/?sourceChain=ethereum&destinationChain=hpp-mainnet&tab=bridge"
                    external={true}
                    className="cursor-pointer"
                  >
                    Go to Bridge
                  </Button>
                </div>
              </div>

              {/* Orbiter Bridge Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl font-bold">O</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Orbiter</h3>
                      <p className="text-gray-600">Fast cross-chain transfers</p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    href="https://orbiter.finance/"
                    external={true}
                    className="cursor-pointer"
                  >
                    Go to Bridge
                  </Button>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-gray-50 rounded-lg p-4 mb-8">
              <p className="text-gray-700 text-sm">
                These are independent third-party service providers that HPP Portal links to for your convenience. HPP
                Portal is not responsible for their operation.
              </p>
            </div>

            {/* FAQ Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-medium text-gray-900 mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqData.map((faq) => (
                  <div key={faq.id} className="bg-white border border-gray-200 rounded-lg">
                    <button
                      className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleFaq(faq.id)}
                    >
                      <span className="text-gray-900 font-medium">{faq.question}</span>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          expandedFaq === faq.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedFaq === faq.id && (
                      <div className="px-4 pb-4">
                        <p className="text-gray-700">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
