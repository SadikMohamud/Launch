// Install.
//
// Three tabs, one per platform, each carrying the command that actually
// works on it. The previous version had a fourth tab installing a skill file
// into an AI coding assistant; that is gone, along with every command that
// pointed at the stub.
//
// The copy button writes the command, not the sample output, because a
// pasted "[pass] Node.js" line helps nobody.

import React, { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useReveal } from '../hooks/useMotion.ts';

interface Platform {
  id: string;
  label: string;
  shell: string;
  /** The command a user copies. */
  command: string;
  /** Extra guidance that only applies to this platform. */
  note?: string;
}

const PLATFORMS: Platform[] = [
  {
    id: 'macos',
    label: 'macOS',
    shell: 'zsh',
    command: 'curl -fsSL https://launch.snurm.com/install.sh | bash',
    note: 'If a global install would need sudo, the installer sets up a user level npm prefix instead and adds it to your shell profile.',
  },
  {
    id: 'ubuntu',
    label: 'Ubuntu',
    shell: 'bash',
    command: 'curl -fsSL https://launch.snurm.com/install.sh | bash',
    note: 'Chromium needs system libraries on Ubuntu, so the installer explains the sudo prompt before it appears.',
  },
  {
    id: 'windows',
    label: 'Windows',
    shell: 'powershell',
    command: 'irm https://launch.snurm.com/install.ps1 | iex',
    note: 'If your execution policy blocks the PowerShell shim, use launch.cmd, which the policy does not apply to.',
  },
];

/** The doctor output, copied verbatim from a real run. */
const DOCTOR_OUTPUT = [
  ['Node.js', 'v22.11.0'],
  ['FFmpeg', 'bundled'],
  ['ffprobe', 'bundled'],
  ['Chromium', '153.0.8010.12'],
  ['Renderer', 'ready'],
  ['Output folder', 'writable'],
  ['Disk space', '248.2 GB free'],
];

export const InstallSection: React.FC = () => {
  const [active, setActive] = useState(PLATFORMS[0]);
  const [copied, setCopied] = useState(false);
  const ref = useReveal<HTMLDivElement>(0.12);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused. The command stays selectable, so
      // the fallback is simply that the person copies it by hand.
      setCopied(false);
    }
  }, []);

  return (
    <section id="install" className="wrap scroll-mt-24 py-section tint-signal">
      <div className="flex flex-col gap-[1.1rem]">
        <p className="eyebrow">Install</p>
        <h2 className="display max-w-prose text-display">Two lines, then a film.</h2>
        <div className="rule-accent" />
      </div>

      <div ref={ref} className="reveal mt-12">
        <div role="tablist" aria-label="Operating system" className="flex w-fit border border-line">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              role="tab"
              type="button"
              aria-selected={platform.id === active.id}
              aria-controls="install-panel"
              onClick={() => setActive(platform)}
              className={[
                'mono border-r border-line px-[1.2rem] py-[0.7rem] text-ui uppercase tracking-[0.12em] last:border-r-0',
                platform.id === active.id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              {platform.label}
            </button>
          ))}
        </div>

        <div id="install-panel" role="tabpanel" className="mt-px border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
              {active.shell}
            </span>
            <button
              type="button"
              onClick={() => copy(active.command)}
              className="mono flex items-center gap-1.5 border border-line px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.14em]"
            >
              {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <pre className="mono overflow-x-auto px-[1.1rem] py-[1.35rem] text-[0.8rem] leading-[1.85]">
            <span className="text-muted"># install</span>
            {'\n'}
            {active.command}
            {'\n\n'}
            <span className="text-muted"># check the machine is ready</span>
            {'\n'}
            launch doctor
            {'\n'}
            {DOCTOR_OUTPUT.map(([name, value]) => (
              <React.Fragment key={name}>
                {'  '}
                <span className="text-accent">[pass]</span> {name.padEnd(15)}
                {value}
                {'\n'}
              </React.Fragment>
            ))}
          </pre>
        </div>

        <p className="mt-4 max-w-prose text-[0.85rem] text-muted">{active.note}</p>

        <p className="mt-6 max-w-prose text-[0.85rem] text-muted">
          The first install downloads a browser and an encoder, about 400MB in total. After that,{' '}
          <code className="mono text-ink">launch https://your-site.com</code> writes an MP4, a
          matching JPEG poster and a tokens JSON into <code className="mono text-ink">./launch-output</code>.
        </p>
      </div>
    </section>
  );
};
