'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { navItems, legalLinks } from '@/config/navigation';
import { ecosystemData } from '@/static/uiData';
import { CheckIcon } from '@/assets/icons';

export default function EcosystemClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          legalLinks={legalLinks}
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
              <h1 className="text-[50px] leading-[1.5] font-[900] text-white text-center">
                HPP <br className="hidden max-[810px]:inline" /> Ecosystem
              </h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-7xl text-center">
                The HPP Ecosystem is an AI-native infrastructure designed for the full data lifecycle, uniting
                intelligent agents, verifiable off-chain computation, and decentralized applications.
              </p>
            </div>
          </div>

          <div className="px-4 max-w-6xl mx-auto">
            {/* Featured Partners */}
            <div className="mt-12.5 min-[1200px]:mt-25 mb-25 min-[1200px]:mb-37.5">
              <h2 className="text-3xl leading-[1.5] font-[900] text-white mb-8">Featured Partners</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 justify-items-center">
                {ecosystemData.featuredPartners.map((partner, index) => {
                  const Card = (
                    <div className="rounded-[5px] px-5 py-7.5 bg-[#111111] w-full lg:max-w-[400px] h-full flex flex-col transition-colors duration-200 group-hover:bg-[#161616]">
                      <div className="flex items-center space-x-2.5 mb-2.5">
                        <div className="w-8 h-8 bg-[#1f2937] rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          <Image src={partner.icon} alt={partner.name} width={22} height={22} />
                        </div>
                        <h3 className="text-lg leading-[1.5] font-semibold text-white">{partner.name}</h3>
                      </div>
                      <p className="text-gray-300 text-base leading-[1.5]">{partner.description}</p>
                    </div>
                  );
                  return partner.link ? (
                    <a
                      key={index}
                      href={partner.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full lg:max-w-[400px] h-full cursor-pointer group transition-transform duration-200"
                    >
                      {Card}
                    </a>
                  ) : (
                    <div key={index} className="w-full lg:max-w-[400px] h-full">
                      {Card}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Build on HPP Section */}
            <div className="mb-12.5 text-center">
              <h2 className="text-[50px] leading-[1.5] font-[900] text-white">Build on HPP</h2>
              <p className="text-xl text-[#bfbfbf] font-semibold">Join our growing ecosystem of partners.</p>
            </div>

            {/* Why Build on HPP & Get Started */}
            <div className="grid grid-cols-1 min-[810px]:grid-cols-2 gap-5">
              {/* Why Build on HPP */}
              <div className="bg-[#121212] rounded-sm p-6">
                <h3 className="text-2xl font-medium text-white mb-10 text-center">Why Build on HPP?</h3>
                <div className="space-y-3 w-fit max-w-[720px] mx-auto text-left">
                  {ecosystemData.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start space-x-2.5">
                      <CheckIcon className="w-4.5 h-4.5" />
                      <h5 className="mt-0.5 text-white text-base font-normal leading-[1]">{benefit}</h5>
                    </div>
                  ))}
                </div>
              </div>

              {/* Get Started */}
              <div className="bg-[#121212] rounded-sm p-6 text-center">
                <h3 className="text-2xl font-medium text-white mb-5">Get Started</h3>
                <div className="w-fit mx-auto flex flex-col space-y-2.5">
                  <Button
                    variant="primary"
                    size="lg"
                    className="whitespace-nowrap w-full"
                    href="https://hppio.typeform.com/to/AYiyaI4s"
                    external
                  >
                    Apply for Partnership
                  </Button>
                  <Button
                    variant="white"
                    size="lg"
                    className="whitespace-nowrap w-full"
                    href="https://docs.hpp.io/"
                    external
                  >
                    View Documentation
                  </Button>
                  <Button
                    variant="white"
                    size="lg"
                    className="whitespace-nowrap w-full"
                    href="https://t.me/aergoofficial"
                    external
                  >
                    Join Telegram
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-25 min-[1200px]:mt-37.5">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
