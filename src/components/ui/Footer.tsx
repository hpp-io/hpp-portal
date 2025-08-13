'use client';

import React from 'react';

export default function Footer() {
  return (
    <div className="max-[1200px]:block hidden bg-black border-t border-[#161616] px-4 py-4">
      <div className="flex items-center justify-center">
        <span className="text-[11px] text-gray-400">© {new Date().getFullYear()} HPP Portal</span>
      </div>
    </div>
  );
}
