// Navigation.
//
// The bar spans the viewport but its contents sit in the same max-width
// container as the page, so the wordmark and the hero share one left edge
// at every width. Without that the two disagree by 240px at 1920.
//
// Every in-page link stays a real anchor with a real href, so middle
// click, open in new tab, copy link address and keyboard activation all
// behave normally. The wipe transition is layered on top of that rather
// than replacing it.

import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle.tsx';
import { useSectionTransition } from '../mechanics/SectionTransition.tsx';

const LINKS = [
  { href: '#proof', label: 'Proof' },
  { href: '#how', label: 'How it works' },
  { href: '#install', label: 'Install' },
  { href: '#platform', label: 'Platform' },
];

export const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useSectionTransition();

  // A menu that survives a resize into the desktop layout leaves the page
  // covered by a panel with no visible way to close it.
  useEffect(() => {
    if (!open) return;

    const query = window.matchMedia('(min-width: 768px)');
    const close = () => setOpen(false);
    query.addEventListener('change', close);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      query.removeEventListener('change', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /**
   * Intercept a plain left click only.
   *
   * A modified click means the visitor asked for a new tab or window, and
   * hijacking that to run an animation in this one would be rude.
   */
  const onLinkClick = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    setOpen(false);
    navigate(href);

    // The address bar should still reflect where the visitor is, without
    // adding a history entry for every jump.
    window.history.replaceState(null, '', href);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-canvas/75 backdrop-blur-[14px]">
      <div className="wrap flex items-center justify-between py-[1.15rem]">
        <a
          href="#main"
          onClick={onLinkClick('#main')}
          className="display text-base tracking-[0.02em]"
          style={{ fontVariationSettings: "'wdth' 125, 'wght' 700" }}
        >
          LAUNCH
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={onLinkClick(link.href)}
              className="text-[0.82rem] text-muted transition-colors duration-signal ease-signal hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <a
            href="#install"
            onClick={onLinkClick('#install')}
            className="mono hidden bg-accent px-[1.15rem] py-[0.7rem] text-ui font-medium uppercase tracking-[0.1em] text-accent-ink sm:inline-block"
          >
            Install
          </a>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close the menu' : 'Open the menu'}
            className="md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="wrap border-t border-line py-4 md:hidden">
          <ul className="flex flex-col">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={onLinkClick(link.href)}
                  className="block border-b border-line py-3.5 text-[0.95rem]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
};
