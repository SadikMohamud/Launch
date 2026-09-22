import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface SplitRevealProps {
  text: string;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export const SplitReveal: React.FC<SplitRevealProps> = ({
  text,
  className = '',
  delay = 0.1,
  as: Component = 'h1'
}) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const words = containerRef.current.querySelectorAll('.split-word');

    gsap.fromTo(
      words,
      {
        y: 40,
        opacity: 0,
        rotateX: -20,
      },
      {
        y: 0,
        opacity: 1,
        rotateX: 0,
        duration: 0.9,
        stagger: 0.04,
        ease: 'power3.out',
        delay,
      }
    );
  }, [text, delay]);

  const words = text.split(' ');

  return (
    <Component
      ref={containerRef as any}
      className={`inline-flex flex-wrap overflow-hidden perspective-1000 ${className}`}
    >
      {words.map((word, i) => (
        <span
          key={i}
          className="split-word inline-block mr-[0.25em] will-change-transform"
        >
          {word}
        </span>
      ))}
    </Component>
  );
};
