// The platform, and the waitlist for it.
//
// Two rules govern this section.
//
// First, nothing is claimed that has not been decided. The price and the
// availability date are marked [TBC] on the page rather than invented, and
// they stay that way until there is a real answer.
//
// Second, a success message is only ever shown after the server confirms the
// entry was stored. A form that says "you are on the list" before the write
// lands is lying to the person who filled it in.

import React, { useRef, useState } from 'react';
import { useReveal } from '../hooks/useMotion.ts';

type Status =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'stored' }
  | { state: 'failed'; message: string };

export const PlatformSection: React.FC = () => {
  const ref = useReveal<HTMLDivElement>(0.12);
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  // A honeypot. Real people never see this field, so anything that fills it
  // is automated. The server makes the same check; this copy only saves a
  // round trip.
  const honeypot = useRef<HTMLInputElement>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.state === 'sending') return;

    const form = event.currentTarget;
    const email = new FormData(form).get('email');

    setStatus({ state: 'sending' });

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, company: honeypot.current?.value ?? '' }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok !== true) {
        setStatus({
          state: 'failed',
          message: result.error ?? 'That did not go through. Please try again.',
        });
        return;
      }

      // Only now, with a confirmed write, is the person told they are on it.
      setStatus({ state: 'stored' });
      form.reset();
    } catch {
      setStatus({ state: 'failed', message: 'No connection. Please try again.' });
    }
  }

  return (
    <section id="platform" className="wrap scroll-mt-24 py-section tint-film wash">
      <div
        ref={ref}
        className="reveal border border-line p-[clamp(2rem,5vw,4.5rem)]"
        style={{
          backgroundImage:
            'radial-gradient(120% 140% at 8% 0%, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 58%)',
        }}
      >
        <p className="eyebrow">Coming soon</p>

        <h2 className="display mt-5 max-w-[20ch] text-display">The Launch platform.</h2>

        <p className="mt-6 max-w-[52ch] text-ink/80">
          Everything the engine does, in your browser. No terminal, no setup. Paste a link, choose
          your format, and download a finished film ready for your launch. Built for studios,
          founders and teams who ship often.
        </p>

        <p className="mono mt-5 text-[0.7rem] tracking-[0.12em] text-accent">
          [TBC] PRICE · [TBC] AVAILABILITY
        </p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-wrap gap-2.5" noValidate>
          <label htmlFor="waitlist-email" className="sr-only">
            Email address
          </label>
          <input
            id="waitlist-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@studio.com"
            className="min-w-0 flex-1 basis-[22rem] border border-line bg-transparent px-[1.1rem] py-4 text-[0.95rem] text-ink placeholder:text-muted"
          />

          {/* Honeypot: off screen, not hidden, so bots that check for
              display:none still fill it in. */}
          <div className="absolute left-[-9999px]" aria-hidden="true">
            <label htmlFor="waitlist-company">Company</label>
            <input id="waitlist-company" ref={honeypot} name="company" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <button
            type="submit"
            disabled={status.state === 'sending'}
            className="mono bg-accent px-[1.15rem] py-4 text-ui font-medium uppercase tracking-[0.1em] text-accent-ink disabled:opacity-60"
          >
            {status.state === 'sending' ? 'Sending' : 'Join the waitlist'}
          </button>
        </form>

        {/* The result is announced, not merely shown, so it reaches a screen
            reader without the person having to go looking for it. */}
        <p role="status" aria-live="polite" className="mt-4 text-[0.85rem]">
          {status.state === 'stored' && (
            <span className="text-accent">
              You are on the list. We will email you when early access opens.
            </span>
          )}
          {status.state === 'failed' && <span className="text-ink">{status.message}</span>}
        </p>

        <p className="mt-4 max-w-[56ch] text-[0.78rem] text-muted">
          We will only email you about early access to the Launch platform. No newsletter, no
          sharing with anyone else. Unsubscribe in one click. See the{' '}
          <a href="/privacy" className="text-ink underline underline-offset-2">
            privacy notice
          </a>
          .
        </p>
      </div>
    </section>
  );
};
