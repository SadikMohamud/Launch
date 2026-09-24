// Proof.
//
// Three films the engine actually rendered, playable inline. This carries
// over the player logic from the original VideoTheater (seek, mute,
// fullscreen, progress) and adds the things it was missing: lazy loading,
// keyboard operable controls, and a poster on every video so nothing shifts
// as the page settles.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { useReveal, staggerDelay } from '../hooks/useMotion.ts';

export interface ProofFilm {
  id: string;
  site: string;
  url: string;
  src: string;
  poster: string;
  /** What the engine measured on this site, shown as the caption. */
  note: string;
}

/**
 * The catalogue.
 *
 * Every entry here is a film the engine produced. Nothing is listed that
 * has not been rendered.
 */
export const proofFilms: ProofFilm[] = [
  {
    id: 'kalandula',
    site: 'kalandula.co.uk',
    url: 'https://kalandula.co.uk',
    src: '/videos/kalandula-launch.mp4',
    poster: '/videos/kalandula.jpg',
    note: 'Bar and restaurant',
  },
  {
    id: 'luminaryhouse',
    site: 'luminaryhouse.co.uk',
    url: 'https://luminaryhouse.co.uk',
    src: '/videos/luminaryhouse-launch.mp4',
    poster: '/videos/luminaryhouse.jpg',
    note: 'Marketing studio',
  },
  {
    id: 'the-forge',
    site: 'tf-ai.agency',
    url: 'https://tf-ai.agency',
    src: '/videos/the-forge-launch.mp4',
    poster: '/videos/the-forge.jpg',
    note: 'Software studio',
  },
];

/** Format seconds as m:ss for the timecode readout. */
function timecode(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

const FilmCard: React.FC<{ film: ProofFilm; index: number }> = ({ film, index }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      setElapsed(video.currentTime);
      setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
    };
    const onMeta = () => setTotal(video.duration);
    const onEnd = () => setPlaying(false);

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('ended', onEnd);

    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('ended', onEnd);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      // A play() rejection is normal when autoplay policy refuses, so the
      // UI state is only updated once playback is actually under way.
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const fullscreen = useCallback(() => {
    videoRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  /** Seek from a click or a keyboard press on the scrub bar. */
  const seek = useCallback((fraction: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = Math.max(0, Math.min(1, fraction)) * video.duration;
  }, []);

  return (
    <figure
      className="reveal group relative overflow-hidden border border-line bg-surface"
      style={{ transitionDelay: staggerDelay(index) }}
    >
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={film.src}
          poster={film.poster}
          preload="metadata"
          muted
          playsInline
          loop={false}
          // Lazy so three films never compete with the hero for bandwidth.
          // eslint-disable-next-line react/no-unknown-property
          {...{ loading: 'lazy' }}
        />

        <button
          type="button"
          onClick={togglePlay}
          aria-label={`${playing ? 'Pause' : 'Play'} the film rendered from ${film.site}`}
          className="absolute inset-0 flex items-center justify-center bg-canvas/20 opacity-0 transition-opacity duration-signal ease-signal focus-visible:opacity-100 group-hover:opacity-100"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-ink">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
          </span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 border-t border-line px-3 py-2.5">
        <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        <input
          type="range"
          min={0}
          max={100}
          value={Number.isFinite(progress) ? progress : 0}
          onChange={(event) => seek(Number(event.target.value) / 100)}
          aria-label={`Seek within the ${film.site} film`}
          className="h-1 flex-1 cursor-pointer appearance-none bg-line accent-[var(--accent)]"
        />

        <span className="mono text-[0.65rem] tabular-nums text-muted">
          {timecode(elapsed)} / {timecode(total)}
        </span>

        <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <button type="button" onClick={fullscreen} aria-label="Play full screen">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <figcaption className="flex items-baseline justify-between border-t border-line px-3 py-2.5">
        <a
          href={film.url}
          className="mono text-[0.68rem] uppercase tracking-[0.14em] hover:text-accent"
          rel="noreferrer noopener"
          target="_blank"
        >
          {film.site}
        </a>
        <span className="text-[0.72rem] text-muted">{film.note}</span>
      </figcaption>
    </figure>
  );
};

export const ProofTheatre: React.FC = () => {
  const ref = useReveal<HTMLDivElement>(0.05);

  return (
    <section id="proof" className="wrap scroll-mt-24 py-section tint-signal wash">
      <div className="flex flex-col gap-[1.1rem]">
        <p className="eyebrow">Proof</p>
        <h2 className="display max-w-prose text-display">Three films, one command each.</h2>
        <div className="rule-accent" />
      </div>

      <div ref={ref} className="mt-14 grid gap-[2px] md:grid-cols-3">
        {proofFilms.map((film, index) => (
          <FilmCard key={film.id} film={film} index={index} />
        ))}
      </div>
    </section>
  );
};
