import React from 'react';
import { MagneticButton } from '../mechanics/MagneticButton.tsx';
import { Play } from 'lucide-react';

interface NavbarProps {
  onWatchClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onWatchClick }) => {
  return (
    <header className="border-b-2 border-ink-900 bg-white/95 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-pink text-white flex items-center justify-center font-extrabold font-mono text-xl shadow-hard">
            /
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-extrabold text-2xl text-ink-900 tracking-tight">Launch</span>
              <span className="text-xs font-mono px-3 py-0.5 rounded-pill bg-accent-green text-ink-900 font-bold uppercase tracking-wider border-2 border-ink-900 shadow-sm">
                Studio
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6 text-sm font-mono font-bold text-ink-900">
            <a href="#showcase" className="hover:text-accent-pink transition-colors">Showcase</a>
            <a href="#install" className="hover:text-accent-pink transition-colors">Install</a>
            <a href="#features" className="hover:text-accent-pink transition-colors">Features</a>
            <a href="#workflow" className="hover:text-accent-pink transition-colors">Workflow</a>
            <a href="#cli" className="hover:text-accent-pink transition-colors">CLI</a>
            <a href="#faq" className="hover:text-accent-pink transition-colors">FAQ</a>
          </nav>

          <MagneticButton
            onClick={onWatchClick}
            className="bg-accent-pink hover:bg-accent-pink/90 text-white text-sm font-mono px-5 py-2.5 rounded-pill font-bold shadow-hard transition-all hover:scale-105 flex items-center gap-2"
          >
            <span>Watch Showcase</span>
            <Play className="w-3.5 h-3.5 fill-current text-white" />
          </MagneticButton>
        </div>
      </div>
    </header>
  );
};
