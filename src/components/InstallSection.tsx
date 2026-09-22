import React, { useState } from 'react';
import { TiltCard } from '../mechanics/TiltCard.tsx';
import { Terminal, Copy, Check, Download, Laptop, Cpu, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

interface InstallOption {
  id: string;
  label: string;
  platform: string;
  cmd: string;
  desc: string;
  notes: string[];
}

const installOptions: InstallOption[] = [
  {
    id: 'agent',
    label: 'Claude Code / Agent Skill',
    platform: 'AI Coding Agents',
    cmd: 'mkdir -p ~/.claude/skills/launch && curl -fsSL https://raw.githubusercontent.com/SadikMohamud/Launch/main/skill/SKILL.md -o ~/.claude/skills/launch/SKILL.md',
    desc: 'Install the native /launch slash command into Claude Code and Antigravity environments.',
    notes: [
      'Enables instant /launch slash command in chat',
      'Auto-detects current project codebase',
      'Direct integration with Hyperframes engine'
    ]
  },
  {
    id: 'npx',
    label: 'npx / npm (Global)',
    platform: 'Cross-Platform (Node.js)',
    cmd: 'npm install -g launch-engine\n# Or run zero-install with npx:\nnpx launch-engine https://example.com',
    desc: 'Install globally via npm or run directly without installation via npx.',
    notes: [
      'Works in PowerShell, Terminal, and Bash',
      'Supports both local directories and live URLs',
      'Zero-install instant execution via npx'
    ]
  },
  {
    id: 'windows',
    label: 'Windows (winget)',
    platform: 'Windows 10 / 11',
    cmd: 'winget install OpenJS.NodeJS.LTS Gyan.FFmpeg Git.Git\nnpm install -g launch-engine',
    desc: 'Install all prerequisites and Launch engine via winget on Windows PowerShell.',
    notes: [
      'Automatically configures Node.js 20+ & FFmpeg',
      'GPU hardware acceleration out of the box',
      'Ready for PowerShell and Windows Terminal'
    ]
  },
  {
    id: 'macos',
    label: 'macOS (Homebrew)',
    platform: 'macOS Apple Silicon / Intel',
    cmd: 'brew install node ffmpeg git\nnpm install -g launch-engine',
    desc: 'One-line Homebrew installation for macOS.',
    notes: [
      'Native Apple Silicon M1/M2/M3 hardware acceleration',
      'FFmpeg bundled with AAC and H.264 codecs',
      'Instant terminal command availability'
    ]
  },
  {
    id: 'linux',
    label: 'Linux (Ubuntu / Debian)',
    platform: 'Linux / WSL2',
    cmd: 'sudo apt update && sudo apt install -y nodejs npm ffmpeg git\nnpm install -g launch-engine',
    desc: 'Debian and Ubuntu package manager installation script.',
    notes: [
      'Full headless Chromium support',
      'Hardware GPU acceleration via VA-API / NVENC',
      'Perfect for CI/CD automated video delivery'
    ]
  }
];

export const InstallSection: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('agent');
  const [copied, setCopied] = useState(false);

  const active = installOptions.find((o) => o.id === selectedTab) || installOptions[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(active.cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-ink-900 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-accent-yellow text-ink-900 font-mono text-xs font-extrabold uppercase tracking-wider mb-2 shadow-hard border-2 border-ink-900">
            Installation & Setup
          </div>
          <h2 className="display-medium text-ink-900">
            How To Install & Run Launch
          </h2>
        </div>
        <p className="text-lg font-bold text-ink-900 font-sans max-w-md leading-relaxed">
          Install as a slash command in your AI coding agent or run globally via npm on any laptop.
        </p>
      </div>

      {/* Main Interactive Installation Box */}
      <div className="bg-[#0c0a09] border-4 border-ink-900 rounded-3xl overflow-hidden shadow-hard-pink">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#171412] border-b-2 border-white/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-accent-pink shadow-sm" />
              <span className="w-3.5 h-3.5 rounded-full bg-accent-yellow shadow-sm" />
              <span className="w-3.5 h-3.5 rounded-full bg-accent-green shadow-sm" />
            </div>
            <span className="text-base font-mono font-extrabold text-white flex items-center gap-2 pl-2">
              <Download className="w-5 h-5 text-accent-green" />
              <span>Select Platform Installation</span>
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-sm font-mono font-extrabold bg-accent-pink hover:bg-white text-white hover:text-ink-900 px-5 py-2.5 rounded-pill transition-all shadow-md self-start sm:self-auto"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-accent-green stroke-[3]" />
                <span className="text-accent-green font-extrabold">Copied Commands!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Command</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2.5 p-4 bg-[#120f0e] border-b-2 border-white/20 overflow-x-auto">
          {installOptions.map((opt) => {
            const isSelected = selectedTab === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedTab(opt.id)}
                className={`px-5 py-2.5 rounded-pill text-sm font-mono whitespace-nowrap font-extrabold transition-all border-2 ${
                  isSelected
                    ? 'bg-accent-yellow text-ink-900 border-accent-yellow shadow-hard scale-105'
                    : 'bg-[#221e1d] text-white hover:bg-[#332c2a] border-white/20'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Terminal Code Box */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-extrabold text-accent-yellow uppercase tracking-wider">
              <Laptop className="w-4 h-4" />
              <span>Target: {active.platform}</span>
            </div>
            <p className="text-white text-base font-bold">
              {active.desc}
            </p>
          </div>

          {/* Code Window */}
          <div className="bg-[#050404] border-2 border-white/20 rounded-2xl p-5 sm:p-6 font-mono text-sm sm:text-base text-accent-green font-extrabold leading-relaxed overflow-x-auto shadow-inner relative group">
            <pre className="whitespace-pre-wrap">{active.cmd}</pre>
          </div>

          {/* Feature Notes Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t-2 border-white/10">
            {active.notes.map((note, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm font-mono font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3-Step Quick Start Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <TiltCard spotlightColor="rgba(255, 0, 144, 0.15)" className="h-full rounded-3xl">
          <div className="bg-surface border-2 border-ink-900 rounded-3xl p-7 h-full flex flex-col justify-between shadow-hard hover:shadow-hard-pink transition-shadow duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-pink text-white flex items-center justify-center border-2 border-ink-900 shadow-sm">
                <Cpu className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="font-sans font-extrabold text-2xl text-ink-900">
                1. Verify Prerequisites
              </h3>
              <p className="text-base font-semibold text-ink-900 leading-relaxed">
                Ensure Node.js 20+ and FFmpeg are installed on your system. Run <code className="bg-white px-2 py-0.5 rounded border border-ink-900 font-mono text-xs font-bold">node -v</code> and <code className="bg-white px-2 py-0.5 rounded border border-ink-900 font-mono text-xs font-bold">ffmpeg -version</code>.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t-2 border-ink-900/15 flex items-center justify-between text-xs font-mono font-extrabold text-ink-900">
              <span>Required</span>
              <span className="bg-accent-green text-ink-900 px-3 py-1 rounded-pill border-2 border-ink-900">Node 20+ & FFmpeg</span>
            </div>
          </div>
        </TiltCard>

        <TiltCard spotlightColor="rgba(0, 255, 102, 0.15)" className="h-full rounded-3xl">
          <div className="bg-surface border-2 border-ink-900 rounded-3xl p-7 h-full flex flex-col justify-between shadow-hard hover:shadow-hard-green transition-shadow duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-green text-ink-900 flex items-center justify-center border-2 border-ink-900 shadow-sm">
                <Terminal className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="font-sans font-extrabold text-2xl text-ink-900">
                2. Run Launch Command
              </h3>
              <p className="text-base font-semibold text-ink-900 leading-relaxed">
                In your project directory or terminal, type <code className="bg-white px-2 py-0.5 rounded border border-ink-900 font-mono text-xs font-bold">/launch</code> or pass any public URL like <code className="bg-white px-2 py-0.5 rounded border border-ink-900 font-mono text-xs font-bold">/launch https://yoursite.com</code>.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t-2 border-ink-900/15 flex items-center justify-between text-xs font-mono font-extrabold text-ink-900">
              <span>Execution</span>
              <span className="bg-accent-yellow text-ink-900 px-3 py-1 rounded-pill border-2 border-ink-900">&lt; 30s Render</span>
            </div>
          </div>
        </TiltCard>

        <TiltCard spotlightColor="rgba(255, 230, 0, 0.15)" className="h-full rounded-3xl">
          <div className="bg-surface border-2 border-ink-900 rounded-3xl p-7 h-full flex flex-col justify-between shadow-hard hover:shadow-hard-yellow transition-shadow duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-yellow text-ink-900 flex items-center justify-center border-2 border-ink-900 shadow-sm">
                <Sparkles className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="font-sans font-extrabold text-2xl text-ink-900">
                3. Collect 60fps Master
              </h3>
              <p className="text-base font-semibold text-ink-900 leading-relaxed">
                Your 60fps cinema promo video <code className="bg-white px-2 py-0.5 rounded border border-ink-900 font-mono text-xs font-bold">launch.mp4</code> and baked poster <code className="bg-white px-2 py-0.5 rounded border border-ink-900 font-mono text-xs font-bold">launch.jpg</code> will be delivered to <code className="bg-white px-2 py-0.5 rounded border border-ink-900 font-mono text-xs font-bold">launch-output/</code>.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t-2 border-ink-900/15 flex items-center justify-between text-xs font-mono font-extrabold text-ink-900">
              <span>Deliverable</span>
              <span className="bg-white text-ink-900 px-3 py-1 rounded-pill border-2 border-ink-900 flex items-center gap-1">
                <span>Zero Watermark</span>
                <ArrowRight className="w-3.5 h-3.5 text-accent-pink" />
              </span>
            </div>
          </div>
        </TiltCard>
      </div>
    </div>
  );
};
