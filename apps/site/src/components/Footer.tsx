// Footer.
//
// The licence line here is the corrected one. The previous footer claimed
// "All Rights Reserved" while the README carried an MIT badge pointing at a
// licence file that did not exist. Launch is proprietary, and the films
// people render with it are theirs; both halves of that are stated plainly.

import React from 'react';

const LINKS = [
  { href: '#install', label: 'Install' },
  { href: '#capabilities', label: 'Flags' },
  { href: '#faq', label: 'FAQ' },
  { href: '/licence', label: 'Licence' },
  { href: '/privacy', label: 'Privacy' },
];

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line">
      <div className="wrap flex flex-wrap justify-between gap-8 py-14">
        <div>
          <p
            className="display text-base tracking-[0.02em]"
            style={{ fontVariationSettings: "'wdth' 125, 'wght' 700" }}
          >
            LAUNCH
          </p>
          <p className="mt-3 max-w-[38ch] text-[0.82rem] text-muted">
            Proprietary software. The films, posters and token files you render are yours, royalty
            free and unwatermarked.
          </p>
          <p className="mt-2 text-[0.82rem] text-muted">
            &copy; {year} Snurm. All rights reserved.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-10 gap-y-3">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-[0.82rem] text-muted transition-colors duration-signal ease-signal hover:text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="https://github.com/SadikMohamud"
                rel="noreferrer noopener"
                target="_blank"
                className="text-[0.82rem] text-muted transition-colors duration-signal ease-signal hover:text-ink"
              >
                Snurm
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
};
