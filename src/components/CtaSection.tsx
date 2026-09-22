import React, { useState } from 'react';
import { MagneticButton } from '../mechanics/MagneticButton.tsx';
import { Film, ArrowRight, Terminal, Copy, Check } from 'lucide-react';

interface CtaSectionProps {
  onWatchClick: () => void;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ onWatchClick }) => {
  const [copied, setCopied] = useState(false);
  const commandText = '/launch https://yoursite.com';

  const handleCopy = () => {
    navigator.clipboard.writeText(commandText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-[#0c0a09] border-4 border-ink-900 rounded-3xl p-8 sm:p-14 text-white shadow-hard-pink relative overflow-hidden my-12">
      {/* Background Decorative Light Sheen */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-pink/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-green/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl space-y-7">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-accent-yellow text-ink-900 font-mono text-xs sm:text-sm font-extrabold border-2 border-ink-900 shadow-hard">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-pink animate-ping" />
          <span>Get Started In Seconds</span>
        </div>

        <h2 className="display-large text-white tracking-tight font-extrabold">
          Ready To Produce Your Next Launch Video?
        </h2>

        <p className="text-xl sm:text-2xl text-[#f5f2ed] font-bold leading-relaxed max-w-2xl">
          Run one command against your repository or website URL to generate an unwatermarked 60fps cinema promo reel.
        </p>

        <div className="flex flex-wrap items-center gap-5 pt-4">
          <MagneticButton
            onClick={onWatchClick}
            className="bg-accent-pink hover:bg-white text-white hover:text-ink-900 px-8 py-4 rounded-pill font-mono text-base font-extrabold shadow-hard flex items-center gap-3 transition-all hover:scale-105"
          >
            <Film className="w-5 h-5 text-accent-yellow" />
            <span>Watch Showcase Reel</span>
            <ArrowRight className="w-5 h-5 text-accent-green" />
          </MagneticButton>

          {/* Interactive Command Copier */}
          <div
            onClick={handleCopy}
            className="group cursor-pointer bg-[#181413] hover:bg-[#25201e] border-2 border-white/30 hover:border-accent-green px-6 py-4 rounded-pill font-mono text-base font-extrabold text-accent-green flex items-center gap-3 transition-all shadow-md"
            title="Click to copy command"
          >
            <Terminal className="w-5 h-5 text-accent-pink flex-shrink-0" />
            <span className="tracking-tight">$ {commandText}</span>
            <span className="ml-2 pl-3 border-l border-white/20 text-white group-hover:text-accent-yellow text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-accent-green stroke-[3]" />
                  <span className="text-accent-green font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
