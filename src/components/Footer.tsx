import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t-2 border-ink-900 bg-surface py-12 px-6 mt-28">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm font-mono font-extrabold text-ink-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-pink text-white flex items-center justify-center font-extrabold text-base shadow-hard">
            /
          </div>
          <span className="font-extrabold text-ink-900 font-sans text-lg">Launch</span>
          <span className="text-ink-900">&middot;</span>
          <span>Cinema Video Engine for Modern Web Projects</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-ink-900 font-bold">Deterministic 60fps &middot; Zero Watermarks</span>
          <a
            href="https://github.com/SadikMohamud"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-900 hover:text-accent-pink transition-colors font-extrabold underline underline-offset-4 text-base"
          >
            Snurm
          </a>
        </div>
      </div>
    </footer>
  );
};
