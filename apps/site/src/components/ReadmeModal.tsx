import React, { useEffect } from 'react';
import { X, Download, Terminal, Cpu, Film, ShieldCheck, Copy, Check, Sparkles, Layers, Sliders } from 'lucide-react';

interface ReadmeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReadmeModal: React.FC<ReadmeModalProps> = ({ isOpen, onClose }) => {
  const [copiedCmd, setCopiedCmd] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#120f0e] border-2 sm:border-4 border-ink-900 dark:border-white/30 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-ink-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b-2 border-ink-900 dark:border-white/20 bg-surface dark:bg-[#181412] flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-accent-pink text-white flex items-center justify-center font-mono font-extrabold text-base shadow-sm">
              /
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-extrabold text-lg sm:text-xl">README & Documentation</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pill bg-accent-yellow text-ink-900 font-extrabold uppercase border border-ink-900">
                  Public Spec
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-[#25201d] border-2 border-ink-900 dark:border-white/20 flex items-center justify-center text-ink-900 dark:text-white hover:bg-accent-pink hover:text-white transition-colors shadow-sm"
            aria-label="Close README Modal"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-10 overflow-y-auto space-y-8 font-sans leading-relaxed">
          {/* Document Title & Badges */}
          <div className="space-y-4 text-center sm:text-left border-b-2 border-ink-900/10 dark:border-white/10 pb-6">
            <h1 className="font-sans text-2xl sm:text-4xl font-extrabold tracking-tight">
              Launch · Instant Cinema Video Engine
            </h1>
            <p className="text-base sm:text-lg text-ink-900 dark:text-[#dcd8d5] font-semibold">
              Generate unwatermarked 60fps cinema promo videos directly from your local codebase or live website URL.
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
              <span className="bg-accent-pink text-white text-xs font-mono font-extrabold px-3 py-1 rounded-pill shadow-sm">
                Proprietary Licence
              </span>
              <span className="bg-accent-green text-ink-900 text-xs font-mono font-extrabold px-3 py-1 rounded-pill border border-ink-900 shadow-sm">
                Node.js &gt;= 20.0.0
              </span>
              <span className="bg-accent-yellow text-ink-900 text-xs font-mono font-extrabold px-3 py-1 rounded-pill border border-ink-900 shadow-sm">
                60fps Deterministic
              </span>
              <span className="bg-ink-900 text-white dark:bg-white dark:text-ink-900 text-xs font-mono font-extrabold px-3 py-1 rounded-pill shadow-sm">
                Zero Watermarks
              </span>
            </div>
          </div>

          {/* Core Capabilities */}
          <div className="space-y-4">
            <h2 className="font-sans text-xl sm:text-2xl font-extrabold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-pink" />
              <span>Key Capabilities</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-semibold">
              <div className="p-4 rounded-xl bg-surface dark:bg-[#181412] border-2 border-ink-900 dark:border-white/20 space-y-1">
                <div className="font-extrabold text-ink-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent-pink" />
                  <span>Computed Style Extraction</span>
                </div>
                <p className="text-xs text-ink-900 dark:text-gray-300 font-medium">
                  Reads real DOM and CSSOM trees to extract exact color palettes, fonts, and layout geometry.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface dark:bg-[#181412] border-2 border-ink-900 dark:border-white/20 space-y-1">
                <div className="font-extrabold text-ink-900 dark:text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-accent-green" />
                  <span>Cubic-Bezier Physics</span>
                </div>
                <p className="text-xs text-ink-900 dark:text-gray-300 font-medium">
                  Synthesizes true GSAP motion curves, spring dampening, and seamless scene transitions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface dark:bg-[#181412] border-2 border-ink-900 dark:border-white/20 space-y-1">
                <div className="font-extrabold text-ink-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-accent-yellow" />
                  <span>Hardware GPU 60fps Master</span>
                </div>
                <p className="text-xs text-ink-900 dark:text-gray-300 font-medium">
                  Renders crystal-clear 1080p and 4K MP4 deliverables frame-by-frame with zero dropped frames.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface dark:bg-[#181412] border-2 border-ink-900 dark:border-white/20 space-y-1">
                <div className="font-extrabold text-ink-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-accent-pink" />
                  <span>Frame-0 Settled Poster Engine</span>
                </div>
                <p className="text-xs text-ink-900 dark:text-gray-300 font-medium">
                  Bakes the settled hero frame into frame 0 of the MP4 using FFmpeg for instant preview loading.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Installation Section */}
          <div className="space-y-4">
            <h2 className="font-sans text-xl sm:text-2xl font-extrabold flex items-center gap-2">
              <Download className="w-5 h-5 text-accent-green" />
              <span>Fast 1-Line Installation</span>
            </h2>

            <div className="space-y-3 font-mono text-xs sm:text-sm">
              {/* Windows 1-Line */}
              <div className="bg-[#0c0a09] border-2 border-ink-900 dark:border-white/20 rounded-xl p-4 text-white space-y-2">
                <div className="flex items-center justify-between text-accent-yellow font-extrabold text-xs">
                  <span>Windows (PowerShell 1-Click)</span>
                  <button
                    onClick={() => handleCopy('irm https://launch-ouzf.vercel.app/install.ps1 | iex', 'm-win')}
                    className="flex items-center gap-1 bg-accent-pink text-white px-2.5 py-1 rounded-pill text-[11px] font-bold"
                  >
                    {copiedCmd === 'm-win' ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd === 'm-win' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-accent-green font-bold break-all">
                  irm https://launch-ouzf.vercel.app/install.ps1 | iex
                </div>
              </div>

              {/* macOS / Linux 1-Line */}
              <div className="bg-[#0c0a09] border-2 border-ink-900 dark:border-white/20 rounded-xl p-4 text-white space-y-2">
                <div className="flex items-center justify-between text-accent-green font-extrabold text-xs">
                  <span>macOS & Linux (Terminal 1-Line)</span>
                  <button
                    onClick={() => handleCopy('curl -fsSL https://launch-ouzf.vercel.app/install.sh | bash', 'm-unix')}
                    className="flex items-center gap-1 bg-accent-pink text-white px-2.5 py-1 rounded-pill text-[11px] font-bold"
                  >
                    {copiedCmd === 'm-unix' ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd === 'm-unix' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-accent-green font-bold break-all">
                  curl -fsSL https://launch-ouzf.vercel.app/install.sh | bash
                </div>
              </div>

              {/* AI Agent Skill */}
              <div className="bg-[#0c0a09] border-2 border-ink-900 dark:border-white/20 rounded-xl p-4 text-white space-y-2">
                <div className="flex items-center justify-between text-accent-pink font-extrabold text-xs">
                  <span>Claude Code & Antigravity (Agent Skill)</span>
                  <button
                    onClick={() => handleCopy('New-Item -ItemType Directory -Force -Path "$HOME\\.claude\\skills\\launch"; Invoke-WebRequest -Uri "https://launch-ouzf.vercel.app/SKILL.md" -OutFile "$HOME\\.claude\\skills\\launch\\SKILL.md"', 'm-skill')}
                    className="flex items-center gap-1 bg-accent-pink text-white px-2.5 py-1 rounded-pill text-[11px] font-bold"
                  >
                    {copiedCmd === 'm-skill' ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd === 'm-skill' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-accent-green font-bold break-all text-[11px]">
                  New-Item -ItemType Directory -Force -Path "$HOME\.claude\skills\launch"; Invoke-WebRequest -Uri "https://launch-ouzf.vercel.app/SKILL.md" -OutFile "$HOME\.claude\skills\launch\SKILL.md"
                </div>
              </div>
            </div>
          </div>

          {/* CLI Reference */}
          <div className="space-y-4">
            <h2 className="font-sans text-xl sm:text-2xl font-extrabold flex items-center gap-2">
              <Terminal className="w-5 h-5 text-accent-yellow" />
              <span>CLI Usage & Command Reference</span>
            </h2>

            <div className="bg-[#0c0a09] border-2 border-ink-900 dark:border-white/20 rounded-xl p-4 text-white font-mono text-xs sm:text-sm space-y-2.5">
              <div><span className="text-accent-pink font-bold"># Generate promo from live URL</span><br /><span className="text-accent-green font-bold">launch https://kalandula.co.uk</span></div>
              <div><span className="text-accent-pink font-bold"># Generate promo from local directory</span><br /><span className="text-accent-green font-bold">launch</span></div>
              <div><span className="text-accent-pink font-bold"># Generate 30-90s long-form narrative</span><br /><span className="text-accent-green font-bold">launch https://luminaryhouse.co.uk --long</span></div>
              <div><span className="text-accent-pink font-bold"># Generate 9:16 vertical reel</span><br /><span className="text-accent-green font-bold">launch --format vertical --tone cinematic</span></div>
            </div>
          </div>

          {/* Proprietary Legal Block */}
          <div className="bg-surface dark:bg-[#181412] border-2 border-ink-900 dark:border-white/20 rounded-2xl p-5 sm:p-6 space-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-mono font-extrabold text-accent-pink uppercase">
              <ShieldCheck className="w-4 h-4" />
              <span>Proprietary Licence Notice</span>
            </div>
            <p className="text-ink-900 dark:text-gray-300 font-medium leading-relaxed">
              &copy; {new Date().getFullYear()} Launch Engine by Snurm. All rights reserved. Proprietary commercial software. Output videos generated by licensed users remain 100% royalty-free and unwatermarked.
            </p>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:p-5 border-t-2 border-ink-900 dark:border-white/20 bg-surface dark:bg-[#181412] flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-mono font-bold text-ink-900 dark:text-gray-400">
            Press <kbd className="bg-white dark:bg-[#25201d] px-1.5 py-0.5 rounded border text-[11px]">ESC</kbd> or click outside to dismiss
          </span>
          <button
            onClick={onClose}
            className="bg-ink-900 dark:bg-white text-white dark:text-ink-900 px-5 py-2 rounded-pill font-mono text-xs sm:text-sm font-extrabold hover:bg-accent-pink transition-colors shadow-sm"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
