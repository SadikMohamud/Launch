import React from 'react';
import { TiltCard } from '../mechanics/TiltCard.tsx';
import { Search, Film, CheckCircle2, ArrowRight } from 'lucide-react';

const workflowSteps = [
  {
    title: 'Inspect & Capture',
    desc: 'Pass a local repository or live URL. The engine reads computed styles, typography hierarchies, and screenshots with zero manual configuration.',
    icon: Search,
    iconBg: 'bg-accent-pink text-white shadow-hard-pink',
    spotlight: 'rgba(255, 0, 144, 0.15)',
    tag: 'CSSOM & Token Extraction',
  },
  {
    title: 'Choreograph & Compose',
    desc: 'Synthesizes scenes, stages layered parallax depth, and applies custom cubic-bezier easing curves sampled directly from the source interface.',
    icon: Film,
    iconBg: 'bg-accent-green text-ink-900 shadow-hard-green',
    spotlight: 'rgba(0, 255, 102, 0.15)',
    tag: 'Kinetic Motion & Timeline',
  },
  {
    title: 'Deliver & Publish',
    desc: 'Renders a deterministic 60fps MP4 master file, bakes the poster into frame 0 to prevent black flash, and outputs ready-to-use launch copy.',
    icon: CheckCircle2,
    iconBg: 'bg-accent-yellow text-ink-900 shadow-hard-yellow',
    spotlight: 'rgba(255, 230, 0, 0.15)',
    tag: '60fps Hardware Render',
  }
];

export const WorkflowSection: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-ink-900 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-accent-green text-ink-900 font-mono text-xs font-extrabold uppercase tracking-wider mb-2 shadow-hard border-2 border-ink-900">
            Pipeline
          </div>
          <h2 className="display-medium text-ink-900">
            How The Engine Works
          </h2>
        </div>
        <p className="text-lg font-bold text-ink-900 font-sans max-w-md leading-relaxed">
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
                className="bg-surface border-2 border-ink-900 rounded-3xl p-8 h-full flex flex-col justify-between shadow-hard hover:shadow-hard-pink transition-shadow duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-ink-900 ${s.iconBg}`}>
                      <Icon className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-mono font-extrabold px-3.5 py-1.5 rounded-pill bg-white border-2 border-ink-900 text-ink-900 shadow-sm">
                      {s.tag}
                    </span>
                  </div>

                  <h3 className="font-sans font-extrabold text-2xl text-ink-900 tracking-tight mb-3">
                    {s.title}
                  </h3>
                  <p className="text-base font-semibold text-ink-900 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t-2 border-ink-900/15 flex items-center justify-between text-xs font-mono font-extrabold text-ink-900">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-green border border-ink-900 animate-pulse" />
                    <span>Active Workflow</span>
                  </span>
                  <span className="text-ink-900 font-extrabold bg-white px-3.5 py-1.5 rounded-pill border-2 border-ink-900 flex items-center gap-1 shadow-sm">
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
