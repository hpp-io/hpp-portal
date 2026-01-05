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

  // Render plain-text answers with clickable links and preserved line breaks
  const renderAnswer = (text: string) => {
    const nodes: React.ReactNode[] = [];
    const lines = (text || '').split('\n');
    const makeLinked = (line: string, lineIdx: number) => {
      const parts: React.ReactNode[] = [];
      const urlRe = /(https?:\/\/[^\s]+)/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = urlRe.exec(line)) !== null) {
        if (m.index > last) parts.push(line.slice(last, m.index));
        const raw = m[0];
        // Trim trailing punctuation commonly placed after URLs in text
        let url = raw;
        let trailing = '';
        while (/[).,;:\]\!]+$/.test(url)) {
          trailing = url.slice(-1) + trailing;
          url = url.slice(0, -1);
        }
        parts.push(
          <a
            key={`url-${lineIdx}-${m.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-[#1998FF] break-words"
          >
            {url}
          </a>
        );
        if (trailing) {
          parts.push(trailing);
        }
        last = urlRe.lastIndex;
      }
      if (last < line.length) parts.push(line.slice(last));
      return parts;
    };
    lines.forEach((line, i) => {
      nodes.push(<React.Fragment key={`line-${i}`}>{makeLinked(line, i)}</React.Fragment>);
      if (i < lines.length - 1) nodes.push(<br key={`br-${i}`} />);
    });
    return nodes;
  };

  return (
    <div className={className}>
      <h2 className="text-3xl leading-[1.5] font-[900] text-white mb-5">{title}</h2>
      <div>
        {items.map((faq, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === items.length - 1;
          const isOpen = openIds.includes(faq.id);
          return (
            <div
              key={faq.id}
              className={`bg-[#111111] ${isFirst ? 'rounded-t-[5px]' : ''} ${isLast ? 'rounded-b-[5px]' : ''}`}
            >
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
                <div
                  className={`px-5 text-base leading-[1.5] tracking-[0.8px] text-[#bfbfbf] overflow-hidden ${
                    isLast && isOpen ? 'pb-7.5' : ''
                  }`}
                >
                  {renderAnswer(faq.answer)}
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
