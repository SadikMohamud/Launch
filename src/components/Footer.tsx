import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t-2 border-ink-900 bg-surface py-8 sm:py-12 px-4 sm:px-6 mt-16 sm:mt-28">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-xs sm:text-sm font-mono font-extrabold text-ink-900 text-center md:text-left">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-accent-pink text-white flex items-center justify-center font-extrabold text-sm sm:text-base shadow-hard">
            /
          </div>
          <span className="font-extrabold text-ink-900 font-sans text-base sm:text-lg">Launch</span>
          <span className="text-ink-900">&middot;</span>
          <span className="text-xs sm:text-sm">Cinema Video Engine for Web Projects</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <span className="text-ink-900 font-bold text-xs sm:text-sm">Deterministic 60fps &middot; Zero Watermarks</span>
          <a
            href="https://github.com/SadikMohamud"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-900 hover:text-accent-pink transition-colors font-extrabold underline underline-offset-4 text-sm sm:text-base"
          >
            Snurm
          </a>
        </div>
      </div>
    </footer>
  );
};
