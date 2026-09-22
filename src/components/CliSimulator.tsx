import React, { useState, useEffect } from 'react';
import { Terminal, Copy, Check, Sparkles, Play } from 'lucide-react';

interface CommandPreset {
  id: string;
  label: string;
  cmd: string;
  desc: string;
  output: string[];
}

const commands: CommandPreset[] = [
  {
    id: 'local',
    label: 'Local Codebase',
    cmd: '/launch',
    desc: 'Short promo video from local repository (15 to 25s)',
    output: [
      '✓ Preflight checks passed: Node 24, FFmpeg, Chrome headless verified',
      '✓ Reading source: package.json, DOM tree, computed design tokens',
      '✓ Extracting real UI motion parameters and cubic-bezier easing curves',
      '✓ Rendering 60fps Hyperframes composition (1920x1080)',
      '✓ Poster baked into frame 0: launch.jpg',
      '★ Delivered: launch-output/launch.mp4 (18.4s) · Zero watermarks'
    ]
  },
  {
    id: 'url',
    label: 'Live Website URL',
    cmd: '/launch https://kalandula.co.uk',
    desc: 'High-production launch from a live web application',
    output: [
      '✓ Capturing live URL: computed tokens, typography, screenshots',
      '✓ Storyboard synthesized with custom scene choreography',
      '✓ Staging kinetic depth layers and responsive viewports',
      '✓ Rendered master 4K composition at 60fps',
      '✓ Frame 0 poster generated: kalandula.jpg',
      '★ Delivered: launch-output/kalandula-launch.mp4 (22.0s)'
    ]
  },
  {
    id: 'long',
    label: 'Long Form (30-90s)',
    cmd: '/launch https://luminaryhouse.co.uk --long',
    desc: 'Long narrative showcase with multi-scene storyboards',
    output: [
      '✓ Capturing architectural assets and layout design tokens',
      '✓ Choreographing 6-scene narrative flow with GSAP timelines',
      '✓ Audio ducking envelopes applied to background music bed',
      '✓ Rendered final 4K composition master at 60fps',
      '★ Delivered: launch-output/luminaryhouse-launch.mp4 (21.0s)'
    ]
  },
  {
    id: 'vertical',
    label: 'Vertical Reel (9:16)',
    cmd: '/launch --format vertical --tone cinematic',
    desc: 'Vertical 9:16 video tailored for mobile feeds and social reels',
    output: [
      '✓ Target viewport configured: 1080x1920 vertical format',
      '✓ Cinematic pacing and high-contrast colour grading applied',
      '✓ Composing typography and layered parallax depth',
      '★ Delivered: launch-output/vertical-reel.mp4 (15.0s)'
    ]
  }
];

export const CliSimulator: React.FC = () => {
  const [selectedId, setSelectedId] = useState('local');
  const [copied, setCopied] = useState(false);
  const [visibleLines, setVisibleLines] = useState<number>(6);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const active = commands.find((c) => c.id === selectedId) || commands[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(active.cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const runSimulation = (id: string) => {
    setSelectedId(id);
    setIsRunning(true);
    setVisibleLines(0);

    const targetCmd = commands.find((c) => c.id === id) || commands[0];
    const total = targetCmd.output.length;

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setVisibleLines(current);
      if (current >= total) {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 160);
  };

  useEffect(() => {
    setVisibleLines(active.output.length);
  }, []);

  return (
    <div className="bg-[#0c0a09] border-2 border-ink-900 rounded-3xl overflow-hidden shadow-2xl">
      {/* Top Window Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#171412] border-b-2 border-white/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-accent-pink shadow-sm" />
            <span className="w-3.5 h-3.5 rounded-full bg-accent-yellow shadow-sm" />
            <span className="w-3.5 h-3.5 rounded-full bg-accent-green shadow-sm" />
          </div>
          <span className="text-base font-mono font-extrabold text-white flex items-center gap-2 pl-2">
            <Terminal className="w-5 h-5 text-accent-pink" />
            Terminal Command Runner
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => runSimulation(selectedId)}
            className="flex items-center gap-2 text-sm font-mono font-extrabold text-ink-900 bg-accent-green hover:bg-white px-4 py-2 rounded-pill transition-all shadow-md"
            title="Simulate Execution"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Simulate Run</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-sm font-mono font-extrabold bg-accent-pink hover:bg-white text-white hover:text-ink-900 px-4 py-2 rounded-pill transition-all shadow-md"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-accent-green" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Command Tabs */}
      <div className="flex gap-3 p-4 bg-[#120f0e] border-b-2 border-white/20 overflow-x-auto">
        {commands.map((c) => {
          const isSelected = selectedId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => runSimulation(c.id)}
              className={`px-5 py-2.5 rounded-pill text-sm font-mono whitespace-nowrap font-extrabold transition-all border-2 ${
                isSelected
                  ? 'bg-accent-pink text-white border-accent-pink shadow-hard-pink scale-105'
                  : 'bg-[#221e1d] text-white hover:bg-[#332c2a] border-white/20'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Terminal Viewport */}
      <div className="bg-[#080707] text-white p-6 sm:p-8 font-mono text-base leading-relaxed space-y-6">
        {/* Command Line Prompt */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b-2 border-white/20">
          <div className="flex items-center gap-3">
            <span className="text-accent-pink font-extrabold text-2xl select-none">$</span>
            <span className="font-extrabold text-white text-lg sm:text-xl tracking-tight bg-white/15 px-4 py-2 rounded-xl border-2 border-white/25">
              {active.cmd}
            </span>
          </div>
          <span className="text-xs sm:text-sm text-ink-900 font-extrabold bg-accent-yellow px-4 py-2 rounded-pill border-2 border-ink-900 flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
            <Sparkles className="w-4 h-4 text-ink-900" />
            <span>{active.desc}</span>
          </span>
        </div>

        {/* Real-time Output Log Lines */}
        <div className="pt-2 space-y-3.5 font-mono">
          {active.output.slice(0, visibleLines).map((line, idx) => {
            const isDelivered = line.startsWith('★ Delivered');
            return (
              <div
                key={idx}
                className={`flex items-start gap-3.5 text-base sm:text-lg transition-all duration-150 ${
                  isDelivered
                    ? 'text-accent-green font-extrabold bg-accent-green/20 p-4 rounded-xl border-2 border-accent-green shadow-md'
                    : 'text-white font-bold'
                }`}
              >
                <span className="text-accent-yellow text-sm select-none pt-0.5 font-extrabold">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span>{line}</span>
              </div>
            );
          })}

          {isRunning && (
            <div className="flex items-center gap-2 text-accent-yellow text-base font-extrabold pt-2 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-yellow" />
              <span>Processing pipeline stream...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
