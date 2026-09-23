import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, Laptop, CheckCircle2, ArrowRight } from 'lucide-react';

interface PrereqItem {
  os: string;
  label: string;
  cmd: string;
  verify: string;
}

const prereqs: PrereqItem[] = [
  {
    os: 'windows',
    label: 'Windows 10 / 11 (PowerShell)',
    cmd: 'winget install OpenJS.NodeJS.LTS Gyan.FFmpeg Git.Git',
    verify: 'node -v && ffmpeg -version && git --version'
  },
  {
    os: 'macos',
    label: 'macOS (Homebrew)',
    cmd: 'brew install node ffmpeg git',
    verify: 'node -v && ffmpeg -version && git --version'
  },
  {
    os: 'linux',
    label: 'Linux (Ubuntu / Debian / WSL)',
    cmd: 'sudo apt update && sudo apt install -y nodejs npm ffmpeg git',
    verify: 'node -v && ffmpeg -version && git --version'
  }
];

interface InstallMethod {
  id: string;
  label: string;
  osBadge: string;
  badgeColor: string;
  cmd: string;
  desc: string;
  bullets: string[];
}

const installMethods: InstallMethod[] = [
  {
    id: 'windows-direct',
    label: 'Windows 1-Click (PowerShell)',
    osBadge: 'Windows 10 / 11',
    badgeColor: 'bg-accent-pink text-white',
    cmd: 'irm https://launch-ouzf.vercel.app/install.ps1 | iex',
    desc: 'Direct automated PowerShell installer hosted on the Launch Engine platform. Sets up ~/.launch-engine and links the global launch command.',
    bullets: [
      'Works in PowerShell and Windows Terminal',
      'Zero GitHub credentials or public repo access required',
      'Instant global registration of launch command'
    ]
  },
  {
    id: 'unix-direct',
    label: 'macOS & Linux (1-Line)',
    osBadge: 'macOS / Linux / WSL',
    badgeColor: 'bg-accent-green text-ink-900',
    cmd: 'curl -fsSL https://launch-ouzf.vercel.app/install.sh | bash',
    desc: 'Direct automated shell script for Apple Silicon, macOS, Ubuntu, Debian, and WSL2 environments.',
    bullets: [
      'Native Apple Silicon M1/M2/M3/M4 acceleration',
      'Full headless Chromium support on Linux',
      'Instant global binary availability in your PATH'
    ]
  },
  {
    id: 'agent-skill',
    label: 'AI Agent Skill (Claude / AGY)',
    osBadge: 'Claude Code & Antigravity',
    badgeColor: 'bg-accent-yellow text-ink-900',
    cmd: '# Windows (PowerShell):\nNew-Item -ItemType Directory -Force -Path "$HOME\\.claude\\skills\\launch"; Invoke-WebRequest -Uri "https://launch-ouzf.vercel.app/SKILL.md" -OutFile "$HOME\\.claude\\skills\\launch\\SKILL.md"\n\n# macOS / Linux (Bash):\nmkdir -p ~/.claude/skills/launch && curl -fsSL https://launch-ouzf.vercel.app/SKILL.md -o ~/.claude/skills/launch/SKILL.md',
    desc: 'Install the native /launch slash command directly into your AI coding assistant.',
    bullets: [
      'Enables /launch slash command directly inside chat',
      'Auto-inspects current project workspace',
      'Direct integration with the 60fps render engine'
    ]
  },
  {
    id: 'licensed-clone',
    label: 'Private Git Clone & Link',
    osBadge: 'Authorized Developers',
    badgeColor: 'bg-white text-ink-900',
    cmd: 'git clone https://github.com/SadikMohamud/Launch.git && cd Launch && npm install && npm link --force',
    desc: 'For authorized team members and licensed developers with private GitHub repository access.',
    bullets: [
      'Clones complete proprietary source repository',
      'Direct access to inspect and modify engine code',
      'Links global binary across your local environment'
    ]
  }
];

interface RunExample {
  id: string;
  title: string;
  tag: string;
  cmd: string;
  desc: string;
  outputPreview: string[];
}

const runExamples: RunExample[] = [
  {
    id: 'live-url',
    title: 'Generate from Live Website URL',
    tag: 'Web Capture',
    cmd: 'launch https://kalandula.co.uk',
    desc: 'Captures live DOM, computes typography and palettes, and outputs a 60fps cinema promo.',
    outputPreview: [
      '✓ Capturing live DOM & computed CSSOM tokens from: https://kalandula.co.uk',
      '✓ Synthesizing GSAP scene choreography & parallax layers',
      '✓ Hardware GPU master render starting (1920x1080 @ 60fps)...',
      '★ Delivered: launch-output/launch.mp4 (Settled poster: launch.jpg)'
    ]
  },
  {
    id: 'local-code',
    title: 'Generate from Local Codebase',
    tag: 'Local Repo',
    cmd: 'launch',
    desc: 'Run inside any React, Vue, Svelte, or HTML directory to generate an unwatermarked 60fps promo.',
    outputPreview: [
      '✓ Reading package.json, source DOM, and computed design tokens',
      '✓ Extracting authentic UI easing curves & physics parameters',
      '✓ Deterministic 60fps Chromium composition rendering...',
      '★ Delivered: launch-output/launch.mp4 · Zero watermarks'
    ]
  },
  {
    id: 'long-form',
    title: 'Long-Form Narrative Reel',
    tag: '30-90s Narrative',
    cmd: 'launch https://luminaryhouse.co.uk --long',
    desc: 'Choreographs an extended multi-scene story with dynamic background audio ducking.',
    outputPreview: [
      '✓ Synthesizing 6-scene storyboard flow from site structure',
      '✓ Automated -18dB audio ducking applied to background music bed',
      '✓ 4K UHD Master render compiled at 60fps',
      '★ Delivered: launch-output/launch.mp4 (4K 60fps)'
    ]
  },
  {
    id: 'vertical-reel',
    title: 'Vertical 9:16 Mobile Reel',
    tag: 'Social & Reels',
    cmd: 'launch --format vertical --tone cinematic',
    desc: 'Outputs a 1080x1920 vertical video optimized for mobile feeds and showcase reels.',
    outputPreview: [
      '✓ Viewport configured: 1080x1920 (9:16 vertical ratio)',
      '✓ Applying cinematic color grading and high-contrast pacing',
      '✓ Frame 0 settled poster baked with FFmpeg',
      '★ Delivered: launch-output/vertical-reel.mp4 (15.0s)'
    ]
  }
];

export const InstallSection: React.FC = () => {
  const [selectedPrereq, setSelectedPrereq] = useState('windows');
  const [selectedInstall, setSelectedInstall] = useState('windows-direct');
  const [selectedExample, setSelectedExample] = useState('live-url');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activePrereq = prereqs.find((p) => p.os === selectedPrereq) || prereqs[0];
  const activeInstall = installMethods.find((m) => m.id === selectedInstall) || installMethods[0];
  const activeExample = runExamples.find((e) => e.id === selectedExample) || runExamples[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-ink-900 dark:border-white/20 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-accent-yellow text-ink-900 font-mono text-xs font-extrabold uppercase tracking-wider mb-2 shadow-hard border-2 border-ink-900">
            Installation & Execution Guide
          </div>
          <h2 className="display-medium text-ink-900 dark:text-white">
            How To Install & Run Launch
          </h2>
        </div>
        <p className="text-base sm:text-lg font-bold text-ink-900 dark:text-[#dcd8d5] font-sans max-w-md leading-relaxed">
          Follow these 3 verified steps to install the binary globally and start rendering 60fps promo videos.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STEP 1: PREREQUISITES
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent-pink text-white font-mono font-extrabold flex items-center justify-center text-sm shadow-sm">
            1
          </div>
          <h3 className="font-sans text-xl sm:text-2xl font-extrabold text-ink-900 dark:text-white">
            Verify System Prerequisites (Node.js 20+ & FFmpeg)
          </h3>
        </div>

        <div className="bg-surface dark:bg-[#181412] border-2 border-ink-900 dark:border-white/20 rounded-2xl p-4 sm:p-6 shadow-hard space-y-4">
          {/* OS Switcher Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {prereqs.map((p) => (
              <button
                key={p.os}
                onClick={() => setSelectedPrereq(p.os)}
                className={`px-4 py-2 rounded-pill font-mono text-xs sm:text-sm font-extrabold transition-all border-2 flex-shrink-0 ${
                  selectedPrereq === p.os
                    ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900 border-ink-900 dark:border-white shadow-sm'
                    : 'bg-white dark:bg-[#25201d] text-ink-900 dark:text-white border-ink-900/20 dark:border-white/10 hover:border-ink-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Command Snippet */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0c0a09] border-2 border-ink-900 dark:border-white/20 rounded-xl p-3.5 sm:p-4 text-white font-mono text-xs sm:text-sm">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-accent-pink font-extrabold">$</span>
              <span className="text-accent-green font-bold">{activePrereq.cmd}</span>
            </div>
            <button
              onClick={() => handleCopy(activePrereq.cmd, `prereq-${activePrereq.os}`)}
              className="flex items-center justify-center gap-1.5 bg-accent-pink hover:bg-white text-white hover:text-ink-900 px-3.5 py-1.5 rounded-pill text-xs font-bold transition-all shadow-sm flex-shrink-0"
            >
              {copiedId === `prereq-${activePrereq.os}` ? (
                <>
                  <Check className="w-3.5 h-3.5 text-accent-green stroke-[3]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-ink-900 dark:text-gray-300 font-semibold pt-1">
            <span className="font-extrabold text-ink-900 dark:text-white">Verify with:</span>
            <code className="bg-white dark:bg-[#25201d] px-2 py-0.5 rounded border border-ink-900/20 dark:border-white/20 text-ink-900 dark:text-accent-yellow">
              {activePrereq.verify}
            </code>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STEP 2: INSTALL LAUNCH (1-LINE AUTOMATED)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent-green text-ink-900 font-mono font-extrabold flex items-center justify-center text-sm shadow-sm">
            2
          </div>
          <h3 className="font-sans text-xl sm:text-2xl font-extrabold text-ink-900 dark:text-white">
            Install Launch Engine Globally (Choose Your Platform)
          </h3>
        </div>

        {/* Big Terminal Card */}
        <div className="bg-[#0c0a09] border-2 sm:border-4 border-ink-900 dark:border-white/20 rounded-2xl sm:rounded-3xl overflow-hidden shadow-hard-pink">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#171412] border-b-2 border-white/20 px-4 sm:px-6 py-3.5 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-accent-pink shadow-sm" />
                <span className="w-3 h-3 rounded-full bg-accent-yellow shadow-sm" />
                <span className="w-3 h-3 rounded-full bg-accent-green shadow-sm" />
              </div>
              <span className="text-sm sm:text-base font-mono font-extrabold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-accent-green" />
                <span>Global Binary Installer</span>
              </span>
            </div>

            <span className={`text-xs font-mono font-extrabold px-3 py-1 rounded-pill uppercase tracking-wider self-start sm:self-auto ${activeInstall.badgeColor}`}>
              {activeInstall.osBadge}
            </span>
          </div>

          {/* Platform Tabs */}
          <div className="flex gap-2 p-3 sm:p-4 bg-[#120f0e] border-b-2 border-white/20 overflow-x-auto scrollbar-none">
            {installMethods.map((m) => {
              const isSelected = selectedInstall === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedInstall(m.id)}
                  className={`px-3.5 sm:px-5 py-2 rounded-pill text-xs sm:text-sm font-mono whitespace-nowrap font-extrabold transition-all border-2 flex-shrink-0 ${
                    isSelected
                      ? 'bg-accent-yellow text-ink-900 border-accent-yellow shadow-hard scale-102'
                      : 'bg-[#221e1d] text-white hover:bg-[#332c2a] border-white/20'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Command Body */}
          <div className="p-4 sm:p-8 space-y-6">
            <div className="space-y-1">
              <div className="text-xs font-mono font-extrabold text-accent-yellow uppercase tracking-wider flex items-center gap-2">
                <Laptop className="w-4 h-4" />
                <span>Description</span>
              </div>
              <p className="text-white text-sm sm:text-base font-bold leading-relaxed">
                {activeInstall.desc}
              </p>
            </div>

            {/* Code Snippet Box */}
            <div className="bg-[#050404] border-2 border-white/25 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative group">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-xs font-mono text-gray-400">
                <span>Terminal Command</span>
                <span className="text-accent-green">100% Tested & Verified</span>
              </div>
              <pre className="font-mono text-xs sm:text-base text-accent-green font-extrabold whitespace-pre-wrap break-all leading-relaxed select-all">
                {activeInstall.cmd}
              </pre>

              <button
                onClick={() => handleCopy(activeInstall.cmd, `install-${activeInstall.id}`)}
                className="mt-4 w-full sm:w-auto flex items-center justify-center gap-2 bg-accent-pink hover:bg-white text-white hover:text-ink-900 px-5 py-2.5 rounded-pill font-mono text-xs sm:text-sm font-extrabold transition-all shadow-md"
              >
                {copiedId === `install-${activeInstall.id}` ? (
                  <>
                    <Check className="w-4 h-4 text-accent-green stroke-[3]" />
                    <span className="text-accent-green font-extrabold">Copied Command to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy 1-Line Command</span>
                  </>
                )}
              </button>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/15">
              {activeInstall.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm font-mono text-white font-bold">
                  <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STEP 3: RUN LAUNCH (HOW TO USE & EXAMPLES)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent-yellow text-ink-900 font-mono font-extrabold flex items-center justify-center text-sm shadow-sm">
            3
          </div>
          <h3 className="font-sans text-xl sm:text-2xl font-extrabold text-ink-900 dark:text-white">
            Run Launch Against Any Website or Local Codebase
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Example Selector Cards */}
          <div className="space-y-3 lg:col-span-1">
            {runExamples.map((ex) => {
              const isSelected = selectedExample === ex.id;
              return (
                <div
                  key={ex.id}
                  onClick={() => setSelectedExample(ex.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-surface dark:bg-[#221e1d] border-ink-900 dark:border-white/40 shadow-hard -translate-y-0.5 ring-2 ring-accent-pink'
                      : 'bg-white dark:bg-[#181412] border-ink-900/20 dark:border-white/10 hover:border-ink-900 text-ink-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-pill bg-accent-yellow text-ink-900 border border-ink-900 shadow-sm">
                      {ex.tag}
                    </span>
                    <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-accent-pink' : 'text-gray-400'}`} />
                  </div>
                  <div className="font-sans font-extrabold text-base text-ink-900 dark:text-white">
                    {ex.title}
                  </div>
                  <div className="font-mono text-xs text-ink-900 dark:text-gray-300 font-bold mt-1 truncate">
                    $ {ex.cmd}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Command & Output Viewer */}
          <div className="lg:col-span-2 bg-[#0c0a09] border-2 border-ink-900 dark:border-white/20 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white font-mono shadow-hard flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-white/20">
                <div className="flex items-center gap-2 text-xs font-mono font-extrabold text-accent-yellow uppercase tracking-wider">
                  <Terminal className="w-4 h-4 text-accent-pink" />
                  <span>Execution Preview</span>
                </div>
                <button
                  onClick={() => handleCopy(activeExample.cmd, `run-${activeExample.id}`)}
                  className="flex items-center justify-center gap-1.5 bg-accent-pink hover:bg-white text-white hover:text-ink-900 px-4 py-1.5 rounded-pill text-xs font-extrabold transition-all shadow-sm self-start sm:self-auto"
                >
                  {copiedId === `run-${activeExample.id}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-accent-green stroke-[3]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Command</span>
                    </>
                  )}
                </button>
              </div>

              {/* Active Command Line */}
              <div className="bg-[#181412] border-2 border-white/20 p-3.5 rounded-xl flex items-center gap-2.5">
                <span className="text-accent-pink font-extrabold text-base select-none">$</span>
                <span className="text-white font-extrabold text-sm sm:text-base">{activeExample.cmd}</span>
              </div>

              <p className="text-xs sm:text-sm font-sans font-bold text-gray-300">
                {activeExample.desc}
              </p>

              {/* Simulated Output Lines */}
              <div className="bg-[#050404] border border-white/20 rounded-xl p-4 space-y-2.5 text-xs sm:text-sm">
                <div className="text-[11px] text-gray-500 uppercase tracking-wider border-b border-white/10 pb-1 font-bold">
                  Standard Output Stream
                </div>
                {activeExample.outputPreview.map((line, idx) => {
                  const isDelivered = line.startsWith('★ Delivered');
                  return (
                    <div
                      key={idx}
                      className={isDelivered ? 'text-accent-green font-extrabold pt-1' : 'text-gray-300 font-medium'}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Delivery Callout */}
            <div className="pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="text-gray-400 font-bold">Output Location:</span>
              <span className="bg-white/10 text-accent-yellow px-3 py-1 rounded-pill border border-white/20 font-extrabold">
                📁 ./launch-output/launch.mp4
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
