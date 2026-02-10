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
      let keyCounter = 0;

      // First, handle markdown-style links [text](url)
      const markdownLinkRe = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
      const segments: Array<{ type: 'text' | 'link'; content: string; url?: string }> = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      // Find all markdown links
      while ((match = markdownLinkRe.exec(line)) !== null) {
        // Add text before the link
        if (match.index > lastIndex) {
          segments.push({ type: 'text', content: line.slice(lastIndex, match.index) });
        }
        // Add the link
        segments.push({ type: 'link', content: match[1], url: match[2] });
        lastIndex = markdownLinkRe.lastIndex;
      }
      // Add remaining text after last link
      if (lastIndex < line.length) {
        segments.push({ type: 'text', content: line.slice(lastIndex) });
      }

      // If no markdown links found, process as before
      if (segments.length === 0) {
        segments.push({ type: 'text', content: line });
      }

      // Process each segment
      segments.forEach((segment) => {
        if (segment.type === 'link') {
          parts.push(
            <a
              key={`md-link-${lineIdx}-${keyCounter++}`}
              href={segment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[#1998FF] break-words"
            >
              {segment.content}
            </a>
          );
        } else {
          // Process plain URLs in text segments
          const text = segment.content;
          const urlRe = /(https?:\/\/[^\s]+)/g;
          let textLast = 0;
          let urlMatch: RegExpExecArray | null;

          while ((urlMatch = urlRe.exec(text)) !== null) {
            if (urlMatch.index > textLast) {
              parts.push(text.slice(textLast, urlMatch.index));
            }
            const raw = urlMatch[0];
            // Trim trailing punctuation commonly placed after URLs in text
            let url = raw;
            let trailing = '';
            while (/[).,;:\]\!]+$/.test(url)) {
              trailing = url.slice(-1) + trailing;
              url = url.slice(0, -1);
            }
            parts.push(
              <a
                key={`url-${lineIdx}-${keyCounter++}`}
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
            textLast = urlRe.lastIndex;
          }
          if (textLast < text.length) {
            parts.push(text.slice(textLast));
          }
        }
      });

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
