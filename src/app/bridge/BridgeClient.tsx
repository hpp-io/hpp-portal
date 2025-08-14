'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/ui/Sidebar';
import Button from '@/components/ui/Button';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { navItems, communityLinks } from '@/config/navigation';
import { ARB, Orbiter, FaqCloseIcon, FaqOpenIcon } from '@/assets/icons';
import { bridgeData } from '@/static/uiData';

export default function BridgeClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openFaqs, setOpenFaqs] = useState<number[]>([]);
  const faqData = bridgeData.faq;

  const openFaq = (id: number) => {
    setOpenFaqs((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const closeFaq = (id: number) => {
    setOpenFaqs((prev) => prev.filter((fid) => fid !== id));
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
              <h1 className="text-[50px] min-[1200px]:text-[70px] leading-[1.5] font-[900] text-white">Bridge</h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-5xl">
                HPP Bridge enables seamless and secure token transfers across multiple networks, ensuring
                interoperability within the HPP ecosystem.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 max-w-6xl mx-auto mt-12.5 min-[1200px]:mt-25">
            {/* Bridge Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Arbitrum Official Bridge */}
              <div className="rounded-[5px] p-6 bg-primary hover:brightness-110 transition-colors">
                <div className="flex flex-col items-start gap-2.5">
                  <Image src={ARB} alt="Arbitrum" width={30} height={30} />
                  <h3 className="text-white text-xl font-semibold leading-[1.5]">Arbitrum Official Bridge</h3>
                  <p className="text-white/90 text-base text-normal leading-[1.5] max-w-md">
                    The most secure way to transfer assets between Ethereum and Arbitrum, ideal for high-value or
                    long-term holdings.
                  </p>
                  <Button
                    variant="white"
                    size="lg"
                    href="https://bridge.arbitrum.io/?destinationChain=190415&sourceChain=ethereum&token=0xe33fbe7584eb79e2673abe576b7ac8c0de62565c"
                    external
                    className="cursor-pointer"
                  >
                    Explore Portal
                  </Button>
                </div>
              </div>

              {/* Orbiter Bridge */}
              <div className="rounded-[5px] p-6 bg-primary hover:brightness-110 transition-colors">
                <div className="flex flex-col items-start gap-2.5">
                  <Image src={Orbiter} alt="Orbiter" width={30} height={30} />
                  <h3 className="text-white text-xl font-semibold leading-[1.5]">Orbiter Bridge</h3>
                  <p className="text-white/90 text-base text-normal leading-[1.5] max-w-md">
                    A fast, low-cost solution for moving assets, ideal for quick transfers and multi-chain activity.
                  </p>
                  <Button
                    variant="white"
                    size="lg"
                    href="https://www.orbiter.finance/bridge"
                    external
                    className="cursor-pointer"
                  >
                    Explore Portal
                  </Button>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[#bfbfbf] text-base leading-[1.5] tracking-[0.8px] mt-10 min-[1200px]:mt-5 mb-25 min-[1200px]:mb-50">
              These are independent third-party services that HPP links to for your convenience. HPP is not responsible
              for their operations, security, or any potential loss incurred when using them.
            </p>

            {/* FAQ */}
            <div className="mb-20">
              <h2 className="text-3xl leading-[1.5] font-[900] text-white mb-5">Frequently Asked Questions</h2>
              <div>
                {faqData.map((faq) => {
                  const isOpen = openFaqs.includes(faq.id);
                  return (
                    <div key={faq.id} className="bg-[#111111]">
                      <button
                        className="w-full px-5 py-7.5 text-left flex items-center justify-between hover:bg-[#171717] transition-colors cursor-pointer"
                        onClick={() => openFaq(faq.id)}
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${faq.id}`}
                      >
                        <span className="text-white text-lg font-semibold leading-[1.2]">{faq.question}</span>
                        {isOpen ? (
                          <span>
                            <button
                              aria-label="Close FAQ"
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeFaq(faq.id);
                              }}
                            >
                              <FaqCloseIcon className="w-4 h-4" />
                            </button>
                          </span>
                        ) : (
                          <FaqOpenIcon className="w-4 h-4" />
                        )}
                      </button>
                      {isOpen && (
                        <div
                          id={`faq-panel-${faq.id}`}
                          className="px-5 pb-5 text-base leading-[1.5] tracking-[0.8px] text-[#bfbfbf] whitespace-pre-line"
                        >
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
