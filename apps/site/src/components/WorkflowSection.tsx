import React from 'react';
import { TiltCard } from '../mechanics/TiltCard.tsx';
import { Search, Film, CheckCircle2, ArrowRight } from 'lucide-react';

interface WorkflowStep {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  badgeBg: string;
  spotlight: string;
  tag: string;
  image: string;
  metric: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    title: 'Inspect & Capture',
    desc: 'Pass a local repository or live URL. The engine reads computed styles, typography hierarchies, and screenshots with zero manual configuration.',
    icon: Search,
    iconBg: 'bg-accent-pink text-white',
    badgeBg: 'bg-accent-yellow text-ink-900',
    spotlight: 'rgba(255, 0, 144, 0.15)',
    tag: 'CSSOM & Token Extraction',
    image: '/launch.jpg',
    metric: '< 400ms DOM Parse',
  },
  {
    title: 'Choreograph & Compose',
    desc: 'Synthesizes scenes, stages layered parallax depth, and applies custom cubic-bezier easing curves sampled directly from the source interface.',
    icon: Film,
    iconBg: 'bg-accent-green text-ink-900',
    badgeBg: 'bg-accent-green text-ink-900',
    spotlight: 'rgba(0, 255, 102, 0.15)',
    tag: 'Kinetic Motion & Timeline',
    image: '/videos/kalandula.jpg',
    metric: 'Sub-Pixel Physics',
  },
  {
    title: 'Deliver & Publish',
    desc: 'Renders a deterministic 60fps MP4 master file, bakes the poster into frame 0 to prevent black flash, and outputs ready-to-use launch copy.',
    icon: CheckCircle2,
    iconBg: 'bg-accent-yellow text-ink-900',
    badgeBg: 'bg-white text-ink-900',
    spotlight: 'rgba(255, 230, 0, 0.15)',
    tag: '60fps Hardware Render',
    image: '/videos/the-forge.jpg',
    metric: '60 FPS Unwatermarked',
  }
];

export const WorkflowSection: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-ink-900 dark:border-white/20 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-accent-green text-ink-900 font-mono text-xs font-extrabold uppercase tracking-wider mb-2 shadow-hard border-2 border-ink-900">
            Pipeline
          </div>
          <h2 className="display-medium text-ink-900 dark:text-white">
            How The Engine Works
          </h2>
        </div>
        <p className="text-lg font-bold text-ink-900 dark:text-[#dcd8d5] font-sans max-w-md leading-relaxed">
          From source code to cinema-grade video delivery in three deterministic steps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {workflowSteps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <TiltCard
              key={idx}
              spotlightColor={s.spotlight}
              className="h-full rounded-3xl"
            >
              <div
                className="bg-surface dark:bg-[#181412] border-2 border-ink-900 dark:border-white/20 rounded-3xl p-6 sm:p-7 h-full flex flex-col justify-between shadow-hard hover:shadow-hard-pink transition-shadow duration-300 group"
              >
                <div>
                  {/* Visual Media Preview Header with Badge */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-ink-900 dark:border-white/20 bg-ink-900 mb-6 shadow-sm">
                    <img
                      src={s.image}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-transparent to-black/20" />

                    {/* Floating Step Icon */}
                    <div className={`absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center border-2 border-ink-900 shadow-md ${s.iconBg}`}>
                      <Icon className="w-5 h-5 stroke-[2.5]" />
                    </div>

                    {/* High-Contrast Readable Tag */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className={`text-xs font-mono font-extrabold px-3 py-1 rounded-pill border-2 border-ink-900 shadow-md ${s.badgeBg}`}>
                        {s.tag}
                      </span>
                      <span className="text-[11px] font-mono font-extrabold bg-ink-900 text-white px-2.5 py-0.5 rounded-pill border border-white/20">
                        {s.metric}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-sans font-extrabold text-2xl text-ink-900 dark:text-white tracking-tight mb-3">
                    {s.title}
                  </h3>
                  <p className="text-base font-semibold text-ink-900 dark:text-[#dcd8d5] leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t-2 border-ink-900/15 dark:border-white/10 flex items-center justify-between text-xs font-mono font-extrabold text-ink-900 dark:text-white">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-green border border-ink-900 animate-pulse" />
                    <span>Active Pipeline</span>
                  </span>
                  <span className="text-ink-900 dark:text-white font-extrabold bg-white dark:bg-[#25201d] px-3.5 py-1.5 rounded-pill border-2 border-ink-900 dark:border-white/20 flex items-center gap-1 shadow-sm">
                    <span>Automated</span>
                    <ArrowRight className="w-4 h-4 text-accent-pink" />
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
