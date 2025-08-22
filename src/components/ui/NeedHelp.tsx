import React from 'react';
import Button from './Button';

export default function NeedHelp() {
  return (
    <div className="text-center py-20 w-full">
      <h3 className="text-[50px] font-black text-white mb-2.5 leading-[1.5em]">Need Help?</h3>
      <p className="text-[#BFBFBF] text-xl leading-[1.5em] font-normal mb-8">
        If you're unsure about which migration path to use or need assistance, our support team is here to help.
      </p>
      <div className="flex flex-row gap-4 justify-center items-center">
        <Button
          variant="primary"
          size="lg"
          href="https://t.me/aergoofficial"
          external
          className="cursor-pointer w-40 h-12 px-6 py-3"
        >
          Contact Support
        </Button>
        <Button
          variant="primary"
          size="lg"
          href="https://docs.hpp.io/community/migration-guides"
          external
          className="cursor-pointer w-40 h-12 px-6 py-3"
        >
          Docs
        </Button>
      </div>
    </div>
  );
}
