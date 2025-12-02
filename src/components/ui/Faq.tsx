'use client';

import React from 'react';
import { FaqCloseIcon, FaqOpenIcon } from '@/assets/icons';

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

export function FaqSection({
  title = 'Frequently Asked Questions',
  items,
  className = '',
}: {
  title?: string;
  items: FaqItem[];
  className?: string;
}) {
  const [openIds, setOpenIds] = React.useState<number[]>([]);

  const toggle = (id: number) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className={className}>
      <h2 className="text-3xl leading-[1.5] font-[900] text-white mb-5">{title}</h2>
      <div>
        {items.map((faq) => {
          const isOpen = openIds.includes(faq.id);
          return (
            <div key={faq.id} className="bg-[#111111]">
              <button
                className="w-full px-5 py-7.5 text-left flex items-center justify-between transition-colors cursor-pointer"
                onClick={() => toggle(faq.id)}
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
  );
}

export default FaqSection;
