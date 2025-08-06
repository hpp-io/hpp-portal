'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import MobileHeader from '@/components/ui/MobileHeader';
import { navItems, communityLinks } from '@/config/navigation';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stats = [
    {
      label: 'Current Block Height',
      value: '2,847,293',
      change: '+12 blocks/min',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      ),
    },
    {
      label: 'TPS (Current Avg)',
      value: '1,247',
      change: '↑ 8.2% vs 24h',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: 'TVL (Total Value Locked)',
      value: '$847.2M',
      change: '↑ 15.3% vs 7d',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
          />
        </svg>
      ),
    },
    {
      label: 'Active Addresses',
      value: '94,573',
      change: '+2,341 today',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      title: 'Bridge Assets',
      description: 'Transfer tokens between Ethereum and HPP Layer2 with minimal fees.',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      action: 'Start bridging →',
    },
    {
      title: 'Participate in Governance',
      description: 'Vote on proposals and shape the future of the HPP network.',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-8 h-8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      action: 'Join governance →',
    },
    {
      title: 'Start Building',
      description: 'Deploy your dApp on HPP with comprehensive developer tools.',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-8 h-8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
      action: 'View docs →',
    },
  ];

  const ecosystemProjects = [
    {
      name: 'HPP DEX',
      description: 'Decentralized exchange for seamless trading.',
      tvl: '$24.5M TVL',
      users: '5.2K users',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-8 h-8">
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
      name: 'HPP Lending',
      description: 'Earn yield and borrow assets efficiently.',
      tvl: '$18.7M TVL',
      users: '3.1K users',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-8 h-8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
          />
        </svg>
      ),
    },
    {
      name: 'HPP Gaming',
      description: 'On-chain gaming with instant transactions.',
      tvl: '$8.3M TVL',
      users: '12.4K users',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-8 h-8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to HPP Portal</h1>
            <p className="text-lg text-gray-600 mb-8 max-w-3xl">
              Interact with the HPP Layer2 network — from bridging assets to participating in governance. Experience
              fast, secure, and cost-effective transactions on our cutting-edge blockchain infrastructure.
            </p>

            {/* Stats Grid */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-gray-500">{stat.icon}</div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                  <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                  <p className="text-sm text-green-600">{stat.change}</p>
                </div>
              ))}
            </div>

            <Button variant="primary" size="lg">
              View on Explorer
            </Button> */}
          </div>
          {/* Quick Actions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickActions.map((action, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="text-blue-600 mb-4">{action.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                  <p className="text-gray-600 mb-4">{action.description}</p>
                  <Button variant="outline" size="sm" className="w-full">
                    {action.action}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          {/* Ecosystem Highlights */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Ecosystem Highlights</h2>
                <p className="text-gray-600">Discover leading dApps built on HPP Layer2.</p>
              </div>
              <span className="text-sm text-gray-500">24 total projects</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {ecosystemProjects.map((project, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="text-blue-600 mb-4">{project.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
                  <p className="text-gray-600 mb-4">{project.description}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{project.tvl}</span>
                    <span className="text-gray-500">{project.users}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button variant="primary" size="lg">
                Explore All
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
