'use client';

import React, { useState, useEffect, useMemo } from 'react';
import '@reown/appkit-ui';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Button from '@/components/ui/Button';
import WalletButton from '@/components/ui/WalletButton';
import { navItems, legalLinks } from '@/config/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import Image from 'next/image';
import { useAppKit } from '@reown/appkit/react';
import axios from 'axios';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { mockAirdropDetails, type AirdropDetail } from '../mockData';
import FaqSection from '@/components/ui/Faq';
import DontMissAirdrop from '@/components/ui/DontMissAirdrop';
import { airdropData } from '@/static/uiData';

export default function AirdropDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const [airdropDetail, setAirdropDetail] = useState<AirdropDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const avatarRef = React.useRef<any>(null);

  // Computed values
  const shortAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 11)}...${address.slice(-9)}`;
  }, [address]);

  // Set avatar address
  useEffect(() => {
    if (avatarRef.current && address) {
      avatarRef.current.address = address;
      avatarRef.current.setAttribute('address', address);
    }
  }, [address]);

  // Parse markdown links in description
  const parseMarkdownLinks = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add the link
      parts.push(
        <a
          key={`link-${keyIndex++}`}
          href={match[2]}
          className="underline text-white hover:text-[#1998FF] transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  // API에서 airdrop 상세 정보 불러오기
  useEffect(() => {
    const fetchAirdropDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // TODO: 실제 API 엔드포인트로 변경
        // const apiBaseUrl = process.env.NEXT_PUBLIC_HPP_AIRDROP_API_URL;
        // const response = await axios.get(`${apiBaseUrl}/airdrop/${id}`);
        // setAirdropDetail(response.data.data);

        // 임시: mock data 사용 (API 연동 시 제거)
        const detail = mockAirdropDetails[id];
        if (detail) {
          setAirdropDetail(detail);
        } else {
          setError('Airdrop not found');
        }
      } catch (err) {
        console.error('Failed to fetch airdrop detail:', err);
        setError('Failed to load airdrop details');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchAirdropDetail();
    }
  }, [id]);

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
          {/* Go Back Button */}
          <div className="ml-4 max-w-6xl mx-auto mb-4 mt-3">
            <Button
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-1 cursor-pointer !bg-[#121212] text-white rounded-[5px]"
            >
              <svg className="w-4 h-4 text-[#FFFFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Go Back</span>
            </Button>
          </div>

          {/* Hero Section */}
          <div className="px-5 max-w-6xl mx-auto py-12.5">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <DotLottieReact src="/lotties/Loading.lottie" autoplay loop style={{ width: 48, height: 48 }} />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-[#bfbfbf] text-xl">{error}</p>
              </div>
            ) : airdropDetail ? (
              <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 min-[1200px]:items-start">
                {/* Right Side - Video */}
                <div className="flex justify-center min-[1200px]:justify-end min-[1200px]:order-2">
                  <div className="w-[400px] h-[400px]">
                    <video
                      src="/videos/Airdrop.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Left Side - Text Content */}
                <div className="flex flex-col items-center text-center min-[1200px]:order-1 min-[1200px]:items-start min-[1200px]:text-left">
                  {/* Status Tag */}
                  <div
                    className="inline-block px-2.5 py-1 rounded-[5px] mb-2.5 text-base font-semibold text-black"
                    style={{
                      backgroundColor:
                        airdropDetail.status === 'On-Going'
                          ? '#5DF23F'
                          : airdropDetail.status === 'Coming Soon'
                          ? '#F7EA94'
                          : '#BFBFBF',
                    }}
                  >
                    {airdropDetail.status}
                  </div>
                  <h1 className="text-[50px] leading-[1.5] font-[900] text-white">{airdropDetail.name}</h1>
                  <div className="space-y-6 text-white text-base leading-[1.5] mb-5">
                    <p className="text-[#bfbfbf] text-base">
                      {parseMarkdownLinks(airdropDetail.description)}
                    </p>
                    <div className="space-y-1">
                      <p className="text-[#bfbfbf] text-base">
                        Claim period: <span className="text-white text-base">{airdropDetail.claimPeriodStart} ~ {airdropDetail.claimPeriodEnd}</span>
                      </p>
                      <p className="text-[#bfbfbf] text-base">
                        Vesting Period: <span className="text-white text-base">{airdropDetail.vestingPeriodStart} ~ {airdropDetail.vestingPeriodEnd} (
                          {airdropDetail.vestingDuration})</span>
                      </p>
                    </div>
                    <p className="text-[#bfbfbf] text-base">{airdropDetail.eligibilityDescription}</p>
                  </div>
                  {isConnected ? (
                   <></>
                  ) : (
                    <Button
                      variant="white"
                      size="md"
                      onClick={() => open({ view: 'Connect' })}
                      className="cursor-pointer border border-white"
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Token Plans Section - Only shown when wallet is connected */}
          {isConnected && airdropDetail && (
            <div className="px-5 max-w-6xl mx-auto mt-20 mb-20">
              {/* Wallet Connection Status */}
              <div className="flex items-center justify-between bg-[#121212] rounded-lg px-5 py-4 border border-[#2D2D2D] mb-8">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-full overflow-hidden bg-black">
                    {React.createElement('wui-avatar', { ref: avatarRef, address })}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-white text-base font-semibold leading-[1.5] tracking-[0.8px]">Token plans for</span>
                    <span className="text-white text-sm leading-[1.5] tracking-[0.8px]">{shortAddress}</span>
                  </div>
                </div>
                <Button variant="white" size="lg" onClick={() => disconnect()} className="cursor-pointer">
                  Disconnect
                </Button>
              </div>

              {/* You are eligible */}
              <h2 className="text-[50px] font-[900] text-white leading-[1.5] mb-8">You are eligible.</h2>

              {/* Overview Section */}
              <div className="mb-8">
                <h3 className="text-white text-xl font-semibold leading-[1.5] mb-5">Overview</h3>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-base leading-[1.5]">
                      5,500,000/10,000,000 (4,500,000 HPP Vested)
                    </span>
                  </div>
                  <div className="relative w-full h-4 bg-[#2D2D2D] rounded-full overflow-hidden">
                    {/* Not Vested (Green) - 55% */}
                    <div className="absolute left-0 top-0 h-full bg-[#5DF23F] rounded-l-full" style={{ width: '55%' }}></div>
                    {/* Vested (Purple) - 45% */}
                    <div className="absolute right-0 top-0 h-full bg-[#4b4ab0] rounded-r-full" style={{ width: '45%' }}></div>
                  </div>
                  {/* Percentage markers */}
                  <div className="flex justify-between mt-2">
                    <span className="text-[#bfbfbf] text-xs">0%</span>
                    <span className="text-[#bfbfbf] text-xs">25%</span>
                    <span className="text-[#bfbfbf] text-xs">50%</span>
                    <span className="text-[#bfbfbf] text-xs">75%</span>
                    <span className="text-[#bfbfbf] text-xs">100%</span>
                  </div>
                </div>

                {/* Token Status Breakdown */}
                <div className="grid grid-cols-2 min-[640px]:grid-cols-4 gap-4 mt-6">
                  <div className="flex flex-col">
                    <span className="text-[#bfbfbf] text-sm leading-[1.5] mb-2">Total Allocation</span>
                    <span className="text-white text-base leading-[1.5]">- HPP</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#5DF23F]"></div>
                      <span className="text-[#bfbfbf] text-sm leading-[1.5]">Not Vested</span>
                    </div>
                    <span className="text-white text-base leading-[1.5]">- HPP</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#4b4ab0]"></div>
                      <span className="text-[#bfbfbf] text-sm leading-[1.5]">Vested</span>
                    </div>
                    <span className="text-white text-base leading-[1.5]">- HPP</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#bfbfbf] text-sm leading-[1.5] mb-2">Claimed</span>
                    <span className="text-white text-base leading-[1.5]">- HPP</span>
                  </div>
                </div>
              </div>

              {/* Claim Section */}
              <div className="flex items-center justify-between bg-[#121212] rounded-lg px-5 py-4 border border-[#2D2D2D]">
                <span className="text-[#5DF23F] text-xl font-semibold leading-[1.5]">
                  10,000,000 HPP tokens ready to claim.
                </span>
                <div className="flex gap-3">
                  <Button variant="white" size="lg" className="cursor-pointer">
                    Claim
                  </Button>
                  <Button variant="black" size="lg" className="cursor-pointer border border-white">
                    Claim
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* FAQ Section */}
          <div className="px-5 max-w-6xl mx-auto mt-20 mb-20">
            <FaqSection items={airdropData.faq} />
          </div>

          {/* Don't Miss the Next Airdrop Section */}
          <DontMissAirdrop />

          <Footer />
        </main>
      </div>
    </div>
  );
}
