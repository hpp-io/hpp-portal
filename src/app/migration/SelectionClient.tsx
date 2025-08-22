'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Header from '@/components/ui/Header';
import RightArrow from '@/assets/icons/RightArrow.svg';
import Button from '@/components/ui/Button';
import AERGO from '@/assets/icons/AergoMS.png';
import AQT from '@/assets/icons/AQTMS.png';
import Sidebar from '@/components/ui/Sidebar';
import Footer from '@/components/ui/Footer';
import { navItems, communityLinks } from '@/config/navigation';
import { FaqCloseIcon, FaqOpenIcon } from '@/assets/icons';
import { migrationData } from '@/static/uiData';
import NeedHelp from '@/components/ui/NeedHelp';
import { CheckIcon } from '@/assets/icons';

export default function SelectionClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openFaqs, setOpenFaqs] = useState<number[]>([]);

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
          <div className="bg-[#121212] border-b border-[#161616] py-7.5">
            <div className="px-4 max-w-6xl mx-auto">
              <h1 className="text-[50px] min-[1200px]:text-[70px] leading-[1.5] font-[900] text-white">
                Choose Your Migration Path
              </h1>
              <p className="text-xl text-[#bfbfbf] font-semibold leading-[1.5] max-w-5xl">
                Select the option that matches your current token holdings to migrate into the HPP Mainnet.
              </p>
            </div>
          </div>
          <div className="px-4 max-w-6xl mx-auto mt-12.5 min-[1200px]:mt-25">
            <div className="grid grid-cols-1 min-[810px]:grid-cols-2 gap-5">
              <div className="rounded-[5px] px-5 py-7.5 bg-primary w-full lg:max-w-[520px] flex flex-col">
                <div className="flex flex-col items-start flex-1">
                  <div className="w-12.5 h-12.5 bg-white rounded-lg flex items-center justify-center mb-5">
                    <Image src={AERGO} alt="AERGO" />
                  </div>
                  <h5 className="text-white text-xl font-semibold leading-[1.5]">AERGO Holder</h5>
                  <p className="text-white/90 text-base text-normal leading-[1.5] max-w-md mb-5.5">
                    I hold AERGO tokens on AERGO Mainnet or Ethereum.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <CheckIcon className="w-4.5 h-4.5" />
                      <span className="text-white text-sm">AERGO on AERGO Mainnet</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckIcon className="w-4.5 h-4.5" />
                      <span className="text-white text-sm">AERGO on Ethereum</span>
                    </div>
                  </div>
                </div>
                <div className="pt-6">
                  <Button
                    href="/migration/AERGO"
                    variant="white"
                    size="lg"
                    icon={<RightArrow className="w-4 h-4 fill-current" />}
                    className="cursor-pointer"
                  >
                    Start AERGO Migration
                  </Button>
                </div>
              </div>

              <div className="rounded-[5px] px-5 py-7.5 bg-primary w-full lg:max-w-[520px] flex flex-col">
                <div className="flex flex-col items-start flex-1">
                  <div className="w-12.5 h-12.5 bg-white rounded-lg flex items-center justify-center mb-5">
                    <Image src={AQT} alt="AQT" />
                  </div>
                  <h5 className="text-white text-xl font-semibold leading-[1.5]">AQT Holder</h5>
                  <p className="text-white/90 text-base text-normal leading-[1.5] max-w-md mb-5.5">
                    I hold AQT tokens on Ethereum.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <CheckIcon className="w-4.5 h-4.5" />
                      <span className="text-white text-sm">AQT on Ethereum</span>
                    </div>
                  </div>
                </div>
                <div className="pt-6">
                  <Button
                    href="/migration/AQT"
                    variant="white"
                    size="lg"
                    icon={<RightArrow className="w-4 h-4 fill-current" />}
                    className="cursor-pointer"
                  >
                    Start AQT Migration
                  </Button>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="mt-12.5 min-[1200px]:mt-25 mb-20" data-faq-section>
              <h2 className="text-3xl leading-[1.5] font-[900] text-white mb-5">FAQ: AERGO → HPP Migration</h2>
              <div>
                {migrationData.faq.map((faq) => {
                  const isOpen = openFaqs.includes(faq.id);
                  return (
                    <div key={faq.id} className="bg-[#111111]">
                      <button
                        className="w-full px-5 py-7.5 text-left flex items-center justify-between transition-colors cursor-pointer"
                        onClick={() => (isOpen ? closeFaq(faq.id) : openFaq(faq.id))}
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${faq.id}`}
                      >
                        <span className="text-white text-lg font-semibold leading-[1.2]">{faq.question}</span>
                        <span className="pointer-events-none">
                          {isOpen ? (
                            <FaqCloseIcon className="w-4 h-4 opacity-80 transition-opacity" />
                          ) : (
                            <FaqOpenIcon className="w-4 h-4 opacity-80 transition-opacity" />
                          )}
                        </span>
                      </button>
                      <div
                        id={`faq-panel-${faq.id}`}
                        className="grid overflow-hidden"
                        style={{
                          gridTemplateRows: isOpen ? '1fr' : '0fr',
                          transition: 'grid-template-rows 300ms ease, opacity 300ms ease',
                          opacity: isOpen ? 1 : 0,
                        }}
                        aria-hidden={!isOpen}
                      >
                        <div className="px-5 pb-5 text-base leading-[1.5] tracking-[0.8px] text-[#bfbfbf] whitespace-pre-line overflow-hidden">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Need Help Section */}
            <NeedHelp />
          </div>
          <div className="mt-25">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
