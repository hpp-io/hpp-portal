'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import NeedHelp from '@/components/ui/NeedHelp';
import WalletButton from '@/components/ui/WalletButton';
import MobileHeader from '@/components/ui/MobileHeader';
import { useAccount } from 'wagmi';
import { navItems, communityLinks } from '@/config/navigation';

export default function MigrationClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fromAmount, setFromAmount] = useState('0.0');
  const [toAmount, setToAmount] = useState('0.0');
  const { isConnected, address } = useAccount();

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    // Calculate to amount based on exchange rate (1 AERGO = 2.45 HPP)
    const numericValue = parseFloat(value) || 0;
    setToAmount((numericValue * 2.45).toFixed(2));
  };

  const handleMaxClick = () => {
    setFromAmount('1234.56');
    setToAmount('3025.67');
  };

  const transactionHistory = [
    {
      id: 1,
      type: 'Migration AERGO → HPP',
      date: '2025-01-13 16:45:28',
      amount: '200 AERGO → 490 HPP',
      status: 'Pending',
      icon: (
        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 2,
      type: 'Migration AERGO → HPP',
      date: '2025-01-15 14:32:15',
      amount: '100 AERGO → 245 HPP',
      status: 'Completed',
      icon: (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      id: 3,
      type: 'Migration AERGO → HPP',
      date: '2025-01-14 09:15:42',
      amount: '50 AERGO → 122.5 HPP',
      status: 'Completed',
      icon: (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
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
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-medium text-gray-900 mb-3">Migrate to HPP</h1>
            <p className="text-gray-600 text-lg">
              Move your AERGO tokens to the HPP Layer2 network using the appropriate migration path based on your source
              chain.
            </p>
          </div>

          {/* Migration Cards */}
          <div className="space-y-8">
            {/* Step 1 Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6">
                <div className="flex items-start mb-6">
                  <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white font-semibold text-sm">1</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-medium text-gray-900 mb-3">AERGO (Mainnet) → HPP (ETH)</h2>
                    <p className="text-gray-600">
                      If you hold AERGO on the <strong>AERGO mainnet</strong>, use the official Aergo Bridge to migrate
                      to HPP via Ethereum.
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
                      <span className="text-xs text-gray-600 text-center">AERGO Bridge</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-2">
                        <span className="text-white text-sm font-medium">HPP</span>
                      </div>
                      <span className="text-xs text-gray-600 text-center">HPP (ETH)</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    size="md"
                    href="https://bridge.aergo.io/"
                    external={true}
                    className="flex items-center justify-center space-x-2"
                  >
                    Go to Aergo Bridge
                  </Button>

                  <Button variant="outline" size="md" className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    <span>View Step-by-Step Guide</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2 Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6">
                <div className="flex items-start mb-6">
                  <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white font-semibold text-sm">2</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-medium text-gray-900 mb-3">AERGO (ETH) → HPP (ETH)</h2>
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
                      <span className="text-xs text-gray-600 text-center">AERGO (ETH)</span>
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

                {/* Action Buttons */}
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

                  {isConnected ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-3">
                            <svg
                              className="w-5 h-5 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                            <span className="text-gray-700">Wallet Connected</span>
                          </div>
                          <div className="mt-2 text-xs text-gray-500 font-mono">{address}</div>
                        </div>
                        <WalletButton />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                            />
                          </svg>
                          <span className="text-gray-700">Connect your wallet to start migration</span>
                        </div>
                        <WalletButton />
                      </div>
                    </div>
                  )}
                </div>

                {/* Token Migration Form */}
                {isConnected && (
                  <div className="mt-8">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                      {/* From Section */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">From</label>
                          <span className="text-sm text-gray-500">Balance: 1,234.56</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            value={fromAmount}
                            onChange={(e) => handleFromAmountChange(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.0"
                          />
                          <button
                            onClick={handleMaxClick}
                            className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                          >
                            MAX
                          </button>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">AERGO</div>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center mb-4">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </div>

                      {/* To Section */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">To</label>
                          <span className="text-sm text-gray-500">Balance: 0.00</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            value={toAmount}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                            placeholder="0.0"
                          />
                        </div>
                        <div className="mt-2 text-sm text-gray-600">HPP</div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Exchange Rate:</span>
                          <span className="text-gray-900">1 AERGO = 2.45 HPP</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Price Impact:</span>
                          <span className="text-gray-900">0.05%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Network Fee:</span>
                          <span className="text-gray-900">~$2.50</span>
                        </div>
                      </div>

                      {/* Migrate Button */}
                      <Button variant="primary" size="lg" className="w-full">
                        Migrate Tokens
                      </Button>
                    </div>
                  </div>
                )}

                {/* Transaction History */}
                {isConnected && (
                  <div className="mt-8">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
                      <div className="space-y-3">
                        {transactionHistory.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              {tx.icon}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{tx.type}</div>
                                <div className="text-xs text-gray-500">{tx.date}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">{tx.amount}</div>
                              <div
                                className={`text-xs ${
                                  tx.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'
                                }`}
                              >
                                {tx.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 text-center">
                        <a href="#" className="text-sm text-blue-600 hover:text-blue-800">
                          View All Transactions
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Complete Your Migration Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm mt-8">
              <div className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-medium text-gray-900 mb-3">Complete Your Migration</h2>
                  <p className="text-gray-600">
                    Once you have HPP tokens on Ethereum, bridge them to the native HPP network for full ecosystem
                    access and benefits.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6">
                  <div className="text-center">
                    <h3 className="text-xl font-normal text-gray-900 mb-4">HPP (ETH) → HPP Native</h3>
                    <p className="text-gray-600 mb-6">
                      Use the Arbitrum Canonical Bridge to move your tokens to the native HPP network.
                    </p>
                  </div>

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
                        <svg
                          className="w-6 h-6 text-gray-400 mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-xs text-gray-600 text-center">Arbitrum Bridge</span>
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
                    <Button
                      variant="primary"
                      size="lg"
                      href="https://bridge.arbitrum.io/?sourceChain=ethereum&destinationChain=hpp-mainnet&tab=bridge"
                      external={true}
                      className="flex items-center justify-center space-x-2 mx-auto"
                    >
                      Go to Arbitrum Canonical Bridge
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Help Section */}
            <NeedHelp />
          </div>
        </div>
      </main>
    </div>
  );
}
