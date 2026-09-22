import React from 'react';
import { TiltCard } from '../mechanics/TiltCard.tsx';
import { Layers, Move, Cpu, Film, Sparkles, Sliders, CheckCircle2, ArrowUpRight } from 'lucide-react';

interface FeatureCard {
  tag: string;
  badgeColor: string;
  spotlightColor: string;
  shadowHover: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  bullets: string[];
  spec: string;
}

const features: FeatureCard[] = [
  {
    tag: 'Design Extraction',
    badgeColor: 'bg-accent-pink text-white shadow-hard-pink',
    spotlightColor: 'rgba(255, 0, 144, 0.12)',
    shadowHover: 'hover:shadow-hard-pink',
    title: 'Automated Style & Palette Extraction',
    desc: 'Analyzes computed CSSOM and DOM style trees to extract exact colour palettes, typographic scales, font stacks, and layout geometry directly from your codebase.',
    icon: Layers,
    bullets: ['Exact harmonic palette matching', 'Font family auto-resolution', 'Computed typography hierarchy'],
    spec: '< 400ms extraction',
  },
  {
    tag: 'Motion Physics',
    badgeColor: 'bg-accent-green text-ink-900 shadow-hard-green',
    spotlightColor: 'rgba(0, 255, 102, 0.12)',
    shadowHover: 'hover:shadow-hard-green',
    title: 'True Cubic-Bezier Motion Choreography',
    desc: 'Samples transition curves, damping parameters, and scroll triggers directly from source styles for true-to-life UI animation and smooth scene handoffs.',
    icon: Move,
    bullets: ['Sub-pixel interpolation', 'Custom bezier easing curves', 'Spring decay physics'],
    spec: 'Sub-pixel precision',
  },
  {
    tag: 'Local Pipeline',
    badgeColor: 'bg-accent-yellow text-ink-900 shadow-hard-yellow',
    spotlightColor: 'rgba(255, 230, 0, 0.12)',
    shadowHover: 'hover:shadow-hard-yellow',
    title: 'Deterministic 60fps Master Rendering',
    desc: 'Frame-accurate Chromium renderer running locally with hardware GPU acceleration. Renders crystal-clear 1080p and 4K masters without dropped frames.',
    icon: Cpu,
    bullets: ['60 FPS fixed frame rate', 'Hardware GPU accelerated', 'Zero watermarks or tags'],
    spec: 'Deterministic clock',
  },
  {
    tag: 'Multi-Aspect',
    badgeColor: 'bg-accent-pink text-white shadow-hard-pink',
    spotlightColor: 'rgba(255, 0, 144, 0.12)',
    shadowHover: 'hover:shadow-hard-pink',
    title: 'Multi-Aspect Ratio Output Matrix',
    desc: 'Render in 16:9 Landscape for web showcases, 9:16 Vertical for mobile reels and social feeds, or 1:1 Square in a single unified pipeline pass.',
    icon: Film,
    bullets: ['1920x1080 Landscape (Web)', '1080x1920 Vertical (Mobile)', '1080x1080 Square (Social)'],
    spec: '3 viewport formats',
  },
  {
    tag: 'Instant Load',
    badgeColor: 'bg-accent-green text-ink-900 shadow-hard-green',
    spotlightColor: 'rgba(0, 255, 102, 0.12)',
    shadowHover: 'hover:shadow-hard-green',
    title: 'Frame-0 Baked Poster Engine',
    desc: 'Automatically identifies the settled hero frame and bakes it into frame 0 of the MP4 using FFmpeg for instant preview loading without black flash.',
    icon: Sparkles,
    bullets: ['Zero initial black flash', 'High-Q JPEG poster export', 'Immediate web stream readiness'],
    spec: '0.00ms flash delay',
  },
  {
    tag: 'Audio Engine',
    badgeColor: 'bg-accent-yellow text-ink-900 shadow-hard-yellow',
    spotlightColor: 'rgba(255, 230, 0, 0.12)',
    shadowHover: 'hover:shadow-hard-yellow',
    title: 'Dynamic Audio Beds & Voiceover Carving',
    desc: 'Automated track gain control, volume envelopes, and dynamic ducking to balance background music cleanly behind voice narration.',
    icon: Sliders,
    bullets: ['Automated -18dB ducking', 'Fade-in and fade-out curves', 'High-fidelity AAC audio'],
    spec: 'Submix bus automation',
  },
];

export const FeaturesGrid: React.FC = () => {
  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-ink-900 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-accent-pink text-white font-mono text-xs font-extrabold uppercase tracking-wider mb-2 shadow-hard">
            Capabilities
          </div>
          <h2 className="display-medium text-ink-900">
            Engine Architecture & Features
          </h2>
        </div>
        <p className="text-lg font-bold text-ink-900 font-sans max-w-md leading-relaxed">
          Built for software engineers, design studios, and product teams to deliver cinema-grade video assets in seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, idx) => {
          const Icon = f.icon;
          return (
            <TiltCard
              key={idx}
              spotlightColor={f.spotlightColor}
              className="h-full rounded-3xl"
            >
              <div
                className={`bg-surface border-2 border-ink-900 rounded-3xl p-8 h-full flex flex-col justify-between shadow-hard transition-shadow duration-300 ${f.shadowHover}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className={`text-xs font-mono font-extrabold px-3.5 py-1.5 rounded-pill border-2 border-ink-900 ${f.badgeColor}`}>
                      {f.tag}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-ink-900 flex items-center justify-center text-ink-900 shadow-sm">
                      <Icon className="w-6 h-6 text-ink-900" />
                    </div>
                  </div>

                  <h3 className="font-sans font-extrabold text-2xl text-ink-900 tracking-tight mb-3">
                    {f.title}
                  </h3>
                  <p className="text-base font-semibold text-ink-900 leading-relaxed mb-6">
                    {f.desc}
                  </p>

                  <div className="space-y-3 pt-4 border-t-2 border-ink-900/15">
                    {f.bullets.map((b, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-2.5 text-sm font-extrabold font-mono text-ink-900">
                        <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t-2 border-ink-900/15 flex items-center justify-between text-xs font-mono font-extrabold text-ink-900">
                  <span className="uppercase tracking-wider">Standard</span>
                  <span className="text-ink-900 font-extrabold bg-white px-3 py-1.5 rounded-pill border-2 border-ink-900 flex items-center gap-1 shadow-sm">
                    <span>{f.spec}</span>
                    <ArrowUpRight className="w-4 h-4 text-accent-pink" />
                  </span>
                </div>
              </div>
            </TiltCard>
          );
        })}
      </div>
    </div>
  );
};
