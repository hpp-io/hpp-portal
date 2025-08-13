'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TwitterIcon, MediumIcon, TelegramIcon, FooterHPPLogo } from '@/assets/icons';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  external?: boolean;
}

interface SidebarProps {
  navItems: NavItem[];
  communityLinks: { label: string; href: string }[];
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ navItems, communityLinks, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const mobileHideWhenOpen = isOpen ? 'max-[1199px]:hidden' : '';
  const getHrefAndExternal = (item: NavItem): { href: string; external: boolean } => {
    if (item.external && item.href) {
      return { href: item.href, external: true };
    }
    if (!item.external) {
      if (item.label.toLowerCase() === 'home') {
        return { href: '/', external: false };
      }
      const page = item.label.toLowerCase().replace(/\s+/g, '-');
      return { href: `/${page}`, external: false };
    }
    return { href: '#', external: false };
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 opacity-30 z-40 min-[1200px]:hidden top-[66px]"
          style={{ background: 'var(--color-primary)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={[
          // Position right for mobile/tablet so it slides from right to left
          'fixed right-0 left-auto min-[1200px]:static min-[1200px]:left-0 z-50 w-screen min-[1200px]:w-64 flex flex-col border-l min-[1200px]:border-r border-[#161616] bg-black',
          'transform transition-transform ease-in-out',
          'min-[1200px]:transform-none min-[1200px]:transition-none',
          'top-[66px] h-[calc(100vh-66px)] min-[1200px]:top-[85px] min-[1200px]:h-[calc(100vh-85px)]',
          isOpen
            ? 'translate-x-0 max-[1199px]:duration-300'
            : 'translate-x-full min-[1200px]:translate-x-0 max-[1199px]:duration-300',
        ].join(' ')}
      >
        {/* Navigation */}
        <nav className="flex-1 p-2">
          <ul className={`space-y-4 ${isOpen ? 'max-[1199px]:pt-4' : ''}`}>
            {navItems.map((item, index) => {
              const { href, external } = getHrefAndExternal(item);
              const isActive = !external && (pathname === href || (href !== '/' && pathname.startsWith(href + '/')));
              const rowClass = [
                'flex items-center space-x-3 px-2.5 py-2.5 rounded-lg transition-colors w-full text-left cursor-pointer',
                isActive ? 'text-white bg-primary' : 'text-gray-200 active:text-white active:bg-primary',
              ].join(' ');

              const RightIcon = external ? (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              );

              const Content = (
                <>
                  <span className="w-5 h-5">{item.icon}</span>
                  <span className="flex-1 text-base font-semibold leading-[1] text-[#FFFFFF] hover:text-[#EDEDED]">
                    {item.label}
                  </span>
                  {RightIcon}
                </>
              );

              return (
                <li key={index}>
                  {external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={rowClass} onClick={onClose}>
                      {Content}
                    </a>
                  ) : (
                    <Link href={href} className={rowClass} onClick={onClose}>
                      {Content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Mobile social icons directly under menu when open */}
          {isOpen && (
            <div className="mt-8 flex justify-center min-[1200px]:hidden">
              <div className="flex items-center space-x-4">
                <a href="#" aria-label="Twitter" className="cursor-pointer">
                  <TwitterIcon className="w-7.5 h-7.5" />
                </a>
                <a href="#" aria-label="Medium" className="cursor-pointer">
                  <MediumIcon className="w-7.5 h-7.5" />
                </a>
                <a href="#" aria-label="Telegram" className="cursor-pointer">
                  <TelegramIcon className="w-7.5 h-7.5" />
                </a>
              </div>
            </div>
          )}
        </nav>

        {/* Community Section */}
        <div className={`p-4 border-t border-[#161616] ${mobileHideWhenOpen}`}>
          <div className="mb-5 space-y-3">
            <div>
              <Image src={FooterHPPLogo} alt="HPP" width={40} height={40} />
            </div>
            <div className="flex items-center space-x-3">
              <a href="#" aria-label="Twitter" className="cursor-pointer">
                <TwitterIcon className="w-7.5 h-7.5" />
              </a>
              <a href="#" aria-label="Medium" className="cursor-pointer">
                <MediumIcon className="w-7.5 h-7.5" />
              </a>
              <a href="#" aria-label="Telegram" className="cursor-pointer">
                <TelegramIcon className="w-7.5 h-7.5" />
              </a>
            </div>
          </div>

          <div className="space-y-2 mb-10.5">
            {communityLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="block text-base leading-[1] text-[#FCFCFC] hover:text-[#EDEDED] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
