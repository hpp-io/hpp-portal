import React from 'react';
import Button from './Button';
import { TwitterIcon, TelegramIcon } from '@/assets/icons';

export default function DontMissAirdrop() {
  return (
    <div className="px-5 max-w-6xl mx-auto mb-20">
      <div className="text-center py-20 w-full">
        <h3 className="text-[50px] font-black text-white leading-[1.5em] tracking-[0] mb-2.5">
          Don't Miss the Next Airdrop
        </h3>
        <p className="text-[#BFBFBF] text-xl leading-[1.5em] tracking-[0.8px] font-normal mb-5">
          Stay up to date with new airdrops across the HPP ecosystem on Twitter and Telegram.
        </p>
        <div className="flex flex-row gap-4 justify-center items-center">
          <Button
            variant="primary"
            size="md"
            href="https://x.com/aergo_io"
            external
            className="cursor-pointer"
            leftIcon={<TwitterIcon className="w-7.5 h-7.5" />}
          >
            Follow us on X
          </Button>
          <Button
            variant="primary"
            size="md"
            href="https://t.me/aergoofficial"
            external
            className="cursor-pointer"
            leftIcon={<TelegramIcon className="w-7.5 h-7.5" />}
          >
            Join the HPP Telegram
          </Button>
        </div>
      </div>
    </div>
  );
}
