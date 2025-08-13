'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { navItems, communityLinks } from '@/config/navigation';
import { homeData } from '@/static/uiData';
import Image from 'next/image';

export default function HomeClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const getQuickActionLink = (title: string): { href: string; external: boolean } => {
    const normalized = title.trim().toLowerCase();
    const labelToFind = normalized === 'start building' ? 'build' : normalized;
    const match = navItems.find((n) => n.label.toLowerCase() === labelToFind);
    if (match) {
      if ((match as any).external && (match as any).href) {
        return { href: (match as any).href as string, external: true };
      }
      const l = match.label.toLowerCase();
      const path = l === 'home' ? '/' : `/${l.replace(/\s+/g, '-')}`;
      return { href: path, external: false };
    }
    // Fallback: derive from title
    const derived = normalized === 'home' ? '/' : `/${normalized.replace(/\s+/g, '-')}`;
    return { href: derived, external: false };
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-x-hidden">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        isSidebarOpen={sidebarOpen}
        onBackClick={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          navItems={navItems}
          communityLinks={communityLinks}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? 'opacity-50 min-[1200px]:opacity-100' : ''
          }`}
        >
          {/* Hero Section */}
          <div className="bg-[#121212] border-b border-[#161616] py-7.5">
            <div className="px-4 max-w-6xl mx-auto">
              <h1 className="text-[50px] min-[1200px]:text-[70px] leading-[1.5] font-[900] text-white">
                Welcome to <span className="inline max-[599px]:block">HPP Portal</span>
              </h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-7xl">
                Welcome to the HPP Portal, where you can migrate your assets, bridge across networks, and start building
                on AI-native Layer 2 infrastructure.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 max-w-6xl mx-auto mt-24">
            <h2 className="text-3xl leading-[1.5] font-[900] text-white mb-5">Quick Actions</h2>
            <div className="grid grid-cols-1 min-[810px]:grid-cols-3 gap-5 justify-items-center">
              {homeData.quickActions.map((action, index) => {
                const link = getQuickActionLink(action.title);
                const CardContent = (
                  <>
                    <div className="text-white mb-4">{action.icon}</div>
                    <h5 className="text-lg font-semibold leading-[1.5] text-white mb-2.5">{action.title}</h5>
                    <p className="text-white leading-[1.5] font-regular tracking-[0.8px]">{action.description}</p>
                    <div className="absolute bottom-4 right-4">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </>
                );

                return link.external ? (
                  <a
                    key={index}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative rounded-lg p-6 border border-transparent bg-primary hover:brightness-110 transition-colors w-full lg:max-w-[400px]"
                  >
                    {CardContent}
                  </a>
                ) : (
                  <Link
                    key={index}
                    href={link.href}
                    className="relative rounded-lg p-6 border border-transparent bg-primary hover:brightness-110 transition-colors w-full lg:max-w-[400px]"
                  >
                    {CardContent}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Ecosystem Highlights */}
          <div className="px-4 max-w-6xl mx-auto mt-24">
            <h2 className="text-3xl leading-[1.5] font-[900] text-white">Ecosystem Highlights</h2>
            <p className="text-xl leading-[1.5] font-semibold text-[#bfbfbf] max-w-4xl">
              Explore leading dApps, AI agents, and on-chain services driving innovation on the HPP Mainnet.
            </p>
            <div className="my-5">
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/ecosystem')}
                className="cursor-pointer whitespace-nowrap bg-[#5651d8] hover:bg-[#5e59e0] border-0"
              >
                Explore More
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 justify-items-center">
              {homeData.ecosystemProjects.map((project, index) => (
                <div
                  key={index}
                  className="rounded-lg px-5 py-7.5 bg-[#111111] hover:bg-[#171717] transition-colors w-full lg:max-w-[400px]"
                >
                  <div className="flex items-center space-x-2.5 mb-2.5">
                    <div className="w-8 h-8 bg-[#1f2937] rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      <Image src={project.icon} alt={project.name} width={22} height={22} />
                    </div>
                    <h5 className="text-lg leading-[1.5] font-semibold text-white">{project.name}</h5>
                  </div>
                  <p className="text-gray-300 text-base leading-[1.5]">{project.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-25">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
