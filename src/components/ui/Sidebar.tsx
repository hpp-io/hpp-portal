'use client';

import React from 'react';
import Link from 'next/link';
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
          className="fixed left-0 right-0 bottom-0 opacity-30 z-40 min-[1200px]:hidden"
          style={{ top: '56px', background: 'var(--color-primary)' }}
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
          isOpen
            ? 'translate-x-0 max-[1199px]:duration-300'
            : 'translate-x-full min-[1200px]:translate-x-0 max-[1199px]:duration-300',
        ].join(' ')}
        style={{ top: '56px', height: 'calc(100vh - 56px)' }}
      >
        {/* Navigation */}
        <nav className="flex-1 p-2">
          <ul className={`space-y-2 ${isOpen ? 'max-[1199px]:space-y-4 max-[1199px]:pt-4' : ''}`}>
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
        </nav>

        {/* Community Section */}
        <div className="p-4 border-t border-[#161616]">
          <div className="mb-4">
            <div className="flex space-x-3">
              <a href="#" className="text-gray-500 hover:text-gray-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c0-.438-.199-1.105-.568-1.802C7.354 6.374 6.299 6 5 6c-1.299 0-2.354.374-2.66 1.198C1.771 7.895 1.572 8.562 1.572 9c0 .438.199 1.105.568 1.802C2.646 11.626 3.701 12 5 12c1.299 0 2.354-.374 2.66-1.198C8.229 9.895 8.428 9.228 8.428 9zM15.228 9c0-.438-.199-1.105-.568-1.802C14.354 6.374 13.299 6 12 6c-1.299 0-2.354.374-2.66 1.198C8.771 7.895 8.572 8.562 8.572 9c0 .438.199 1.105.568 1.802C9.646 11.626 10.701 12 12 12c1.299 0 2.354-.374 2.66-1.198C15.229 9.895 15.428 9.228 15.428 9z"
                  />
                </svg>
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </a>
            </div>
          </div>

          <div className="space-y-2">
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
