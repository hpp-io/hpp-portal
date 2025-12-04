'use client';

import React from 'react';
import { legalLinks } from '@/config/navigation';
import { TwitterIcon, MediumIcon, TelegramIcon, FooterHPPLogo } from '@/assets/icons';
import Image from 'next/image';

export default function Footer() {
  return (
    <div className="max-[1200px]:block hidden bg-[#121212] p-4">
      <div className="p-4 border-t border-[#161616] text-center">
        <div className="mb-4">
          <div className="flex flex-col items-center gap-5">
            <Image src={FooterHPPLogo} alt="HPP" width={40} height={40} />
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/aergo_io"
                aria-label="Twitter"
                className="cursor-pointer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <TwitterIcon className="w-7.5 h-7.5" />
              </a>
              <a
                href="https://medium.com/aergo"
                aria-label="Medium"
                className="cursor-pointer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MediumIcon className="w-7.5 h-7.5" />
              </a>
              <a
                href="https://t.me/aergoofficial"
                aria-label="Telegram"
                className="cursor-pointer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <TelegramIcon className="w-7.5 h-7.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-center">
          {legalLinks.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="block text-base leading-[1] text-[#FCFCFC] hover:text-[#EDEDED] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* <div className="flex items-center justify-center">
        <span className="text-[11px] text-gray-400">© {new Date().getFullYear()} HPP</span>
      </div> */}
    </div>
  );
}
