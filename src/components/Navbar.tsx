import React, { useState, useEffect } from 'react';
import { MagneticButton } from '../mechanics/MagneticButton.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { Play, Menu, X, ArrowRight } from 'lucide-react';

interface NavbarProps {
  onWatchClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onWatchClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleWatchShowcase = () => {
    setMobileMenuOpen(false);
    onWatchClick();
  };

  return (
    <header className="border-b-2 border-ink-900 dark:border-white/20 bg-white/95 dark:bg-[#0c0a09]/95 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-pink text-white flex items-center justify-center font-extrabold font-mono text-lg sm:text-xl shadow-hard">
            /
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-sans font-extrabold text-xl sm:text-2xl text-ink-900 dark:text-white tracking-tight">Launch</span>
              <span className="text-[10px] sm:text-xs font-mono px-2 sm:px-3 py-0.5 rounded-pill bg-accent-green text-ink-900 font-extrabold uppercase tracking-wider border-2 border-ink-900 shadow-sm">
                Studio
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm font-mono font-bold text-ink-900 dark:text-gray-200">
            <a href="#showcase" className="hover:text-accent-pink dark:hover:text-accent-pink transition-colors">Showcase</a>
            <a href="#install" className="hover:text-accent-pink dark:hover:text-accent-pink transition-colors">Install</a>
            <a href="#features" className="hover:text-accent-pink dark:hover:text-accent-pink transition-colors">Features</a>
            <a href="#workflow" className="hover:text-accent-pink dark:hover:text-accent-pink transition-colors">Workflow</a>
            <a href="#cli" className="hover:text-accent-pink dark:hover:text-accent-pink transition-colors">CLI</a>
            <a href="#faq" className="hover:text-accent-pink dark:hover:text-accent-pink transition-colors">FAQ</a>
          </nav>

          {/* Theme Switcher */}
          <ThemeToggle />

          <MagneticButton
            onClick={onWatchClick}
            className="bg-accent-pink hover:bg-accent-pink/90 text-white text-sm font-mono px-5 py-2.5 rounded-pill font-bold shadow-hard transition-all hover:scale-105 flex items-center gap-2"
          >
            <span>Watch Showcase</span>
            <Play className="w-3.5 h-3.5 fill-current text-white" />
          </MagneticButton>
        </div>

        {/* Mobile Header Actions */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile Theme Toggle */}
          <ThemeToggle />

          <button
            onClick={handleWatchShowcase}
            className="bg-accent-pink text-white text-xs font-mono px-3 py-2 rounded-pill font-extrabold shadow-sm flex items-center gap-1.5"
            aria-label="Watch Showcase"
          >
            <Play className="w-3 h-3 fill-current text-white" />
            <span>Watch</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 rounded-xl bg-surface dark:bg-[#1e1a18] border-2 border-ink-900 dark:border-white/20 flex items-center justify-center text-ink-900 dark:text-white shadow-sm"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b-2 border-ink-900 dark:border-white/20 bg-surface/98 dark:bg-[#141110]/98 backdrop-blur-2xl px-6 py-6 space-y-5 animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col space-y-3 font-mono text-base font-extrabold text-ink-900 dark:text-white">
            <button
              onClick={() => handleNavClick('showcase')}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1f1c1a] border-2 border-ink-900 dark:border-white/20 shadow-sm hover:bg-accent-yellow hover:text-ink-900 transition-colors text-left"
            >
              <span>Showcase Cinema</span>
              <ArrowRight className="w-4 h-4 text-accent-pink" />
            </button>
            <button
              onClick={() => handleNavClick('install')}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1f1c1a] border-2 border-ink-900 dark:border-white/20 shadow-sm hover:bg-accent-yellow hover:text-ink-900 transition-colors text-left"
            >
              <span>Install & Setup</span>
              <ArrowRight className="w-4 h-4 text-accent-green" />
            </button>
            <button
              onClick={() => handleNavClick('features')}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1f1c1a] border-2 border-ink-900 dark:border-white/20 shadow-sm hover:bg-accent-yellow hover:text-ink-900 transition-colors text-left"
            >
              <span>Engine Features</span>
              <ArrowRight className="w-4 h-4 text-accent-pink" />
            </button>
            <button
              onClick={() => handleNavClick('workflow')}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1f1c1a] border-2 border-ink-900 dark:border-white/20 shadow-sm hover:bg-accent-yellow hover:text-ink-900 transition-colors text-left"
            >
              <span>Pipeline Workflow</span>
              <ArrowRight className="w-4 h-4 text-accent-green" />
            </button>
            <button
              onClick={() => handleNavClick('cli')}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1f1c1a] border-2 border-ink-900 dark:border-white/20 shadow-sm hover:bg-accent-yellow hover:text-ink-900 transition-colors text-left"
            >
              <span>Terminal CLI Runner</span>
              <ArrowRight className="w-4 h-4 text-accent-yellow" />
            </button>
            <button
              onClick={() => handleNavClick('faq')}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1f1c1a] border-2 border-ink-900 dark:border-white/20 shadow-sm hover:bg-accent-yellow hover:text-ink-900 transition-colors text-left"
            >
              <span>Frequently Asked Questions</span>
              <ArrowRight className="w-4 h-4 text-accent-pink" />
            </button>
          </nav>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={handleWatchShowcase}
              className="w-full bg-accent-pink text-white py-4 rounded-pill font-mono text-sm font-extrabold shadow-hard flex items-center justify-center gap-2"
            >
              <span>Play 4K Showcase Reel</span>
              <Play className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
