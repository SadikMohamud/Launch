import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  {
    q: 'How fast is a typical video render?',
    a: 'Short promo videos (15 to 25 seconds) typically render in under 30 seconds on standard laptop hardware using our local GPU-accelerated Chromium renderer.'
  },
  {
    q: 'Are there any watermarks or platform attribution?',
    a: 'Zero. Every file produced is 100% white-label and unwatermarked, delivered directly to your project directory ready for commercial deployment.'
  },
  {
    q: 'What video aspect ratios and resolutions are supported?',
    a: 'Launch supports 16:9 Landscape (1920x1080 and 4K), 9:16 Vertical (1080x1920 for mobile reels and social channels), and 1:1 Square formats.'
  },
  {
    q: 'Can Launch extract styles from a live website or a local repo?',
    a: 'Both. Pass a local project folder to extract from the source code, or supply any public https URL to perform live DOM and CSSOM style capture.'
  },
  {
    q: 'How does the frame 0 poster engine work?',
    a: 'The engine identifies the settled hero frame and bakes it into frame 0 of the MP4 using FFmpeg, ensuring instant visual loading without black flash.'
  }
];

export const FaqSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-ink-900 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-accent-yellow text-ink-900 font-mono text-xs font-extrabold uppercase tracking-wider mb-2 shadow-hard border-2 border-ink-900">
            FAQ
          </div>
          <h2 className="display-medium text-ink-900">
            Frequently Asked Questions
          </h2>
        </div>
        <p className="text-lg font-bold text-ink-900 font-sans max-w-md leading-relaxed">
          Common questions about video generation, formats, and local pipeline rendering.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {faqs.map((f, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'border-ink-900 bg-surface shadow-hard'
                  : 'border-ink-900 bg-white hover:bg-surface'
              }`}
            >
              <div
                onClick={() => toggleFaq(idx)}
                className="p-6 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <h3 className="font-sans font-extrabold text-xl text-ink-900">{f.q}</h3>
                <button
                  className={`w-9 h-9 rounded-pill border-2 border-ink-900 flex items-center justify-center font-bold flex-shrink-0 transition-all ${
                    isOpen ? 'bg-accent-pink text-white shadow-sm' : 'bg-white text-ink-900'
                  }`}
                >
                  {isOpen ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              {isOpen && (
                <div className="px-6 pb-6 pt-3 text-ink-900 font-semibold leading-relaxed border-t-2 border-ink-900/15 bg-white text-base sm:text-lg">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
