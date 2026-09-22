import React from 'react';

export const MarqueeTicker: React.FC = () => {
  const items = [
    '60FPS DETERMINISTIC RENDERING',
    'ZERO WATERMARKS',
    'COMPUTED CSSOM TOKENS',
    'FRAME-0 BAKED POSTERS',
    '16:9 LANDSCAPE & 9:16 VERTICAL',
    'AUDIO BED DUCKING',
    'LOCAL GPU ACCELERATION',
    'INSTANT PROMO DELIVERY',
  ];

  return (
    <div className="w-full overflow-hidden bg-ink-900 border-y-2 border-ink-900 py-4 select-none">
      <div className="flex w-max animate-marquee space-x-8 font-mono text-sm sm:text-base font-extrabold tracking-wider text-white">
        {[...items, ...items, ...items].map((item, idx) => (
          <div key={idx} className="flex items-center space-x-8">
            <span className={idx % 3 === 0 ? 'text-accent-pink' : idx % 3 === 1 ? 'text-accent-green' : 'text-accent-yellow'}>
              ★ {item}
            </span>
            <span className="text-white font-bold">&middot;</span>
          </div>
        ))}
      </div>
    </div>
  );
};
