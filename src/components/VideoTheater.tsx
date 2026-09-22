import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink, ChevronRight } from 'lucide-react';

export interface VideoItem {
  id: string;
  title: string;
  domain: string;
  url?: string;
  tag: string;
  isComingSoon?: boolean;
  desc: string;
  src: string;
  poster: string;
  accentBadge: string;
  duration: string;
  fps: string;
}

export const videoCatalog: VideoItem[] = [
  {
    id: 'launch',
    title: 'Launch Engine',
    domain: 'launch-engine.local',
    tag: 'Pipeline Master',
    desc: 'Self-generated promo video compiled directly from project source code and computed tokens at 60fps.',
    src: '/launch.mp4',
    poster: '/launch.jpg',
    accentBadge: 'bg-accent-pink text-white shadow-hard-pink',
    duration: '0:18',
    fps: '60 FPS 1080p',
  },
  {
    id: 'kalandula',
    title: 'Kalandula Gallery',
    domain: 'kalandula.co.uk',
    url: 'https://kalandula.co.uk',
    tag: 'Live Showcase',
    desc: 'A bespoke African art and cultural heritage gallery connecting rare physical masterworks to international collectors.',
    src: '/videos/kalandula-launch.mp4',
    poster: '/videos/kalandula.jpg',
    accentBadge: 'bg-accent-yellow text-ink-900 shadow-hard-yellow',
    duration: '0:22',
    fps: '60 FPS 4K',
  },
  {
    id: 'luminary',
    title: 'Luminary House',
    domain: 'luminaryhouse.co.uk',
    url: 'https://luminaryhouse.co.uk',
    tag: 'Live Showcase',
    desc: 'Architectural staging studio creating cinema-grade digital tours and spatial walkthroughs for prime residential developments.',
    src: '/videos/luminaryhouse-launch.mp4',
    poster: '/videos/luminaryhouse.jpg',
    accentBadge: 'bg-accent-green text-ink-900 shadow-hard-green',
    duration: '0:21',
    fps: '60 FPS 4K',
  },
  {
    id: 'forge',
    title: 'The Forge',
    domain: 'tf-ai.agency',
    url: 'https://tf-ai.agency',
    tag: 'Coming Soon',
    isComingSoon: true,
    desc: 'A bespoke creative and technical agency crafting high-end digital platforms and interactive experiences.',
    src: '/videos/the-forge-launch.mp4',
    poster: '/videos/the-forge.jpg',
    accentBadge: 'bg-ink-900 text-white shadow-hard',
    duration: '0:21',
    fps: '60 FPS 4K',
  },
  {
    id: 'ar-vr',
    title: 'Spatial AR & VR Launch',
    domain: 'spatial.launch',
    tag: 'Coming Soon',
    isComingSoon: true,
    desc: 'Immersive spatial video compositions and WebXR product reveals tailored for Apple Vision Pro and spatial headsets.',
    src: '/launch.mp4',
    poster: '/launch.jpg',
    accentBadge: 'bg-accent-pink text-white shadow-hard-pink',
    duration: 'Coming Soon',
    fps: 'Spatial 90 FPS',
  }
];

export const VideoTheater: React.FC = () => {
  const [activeVideo, setActiveVideo] = useState<VideoItem>(videoCatalog[0]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('00:00');
  const [duration, setDuration] = useState('00:00');
  const [isHovered, setIsHovered] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));

    const handleTimeUpdate = () => {
      const cur = video.currentTime;
      const dur = video.duration || 1;
      setProgress((cur / dur) * 100);

      const curM = Math.floor(cur / 60);
      const curS = Math.floor(cur % 60);
      setCurrentTime(`${String(curM).padStart(2, '0')}:${String(curS).padStart(2, '0')}`);

      if (video.duration) {
        const durM = Math.floor(dur / 60);
        const durS = Math.floor(dur % 60);
        setDuration(`${String(durM).padStart(2, '0')}:${String(durS).padStart(2, '0')}`);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [activeVideo]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const changeSpeed = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    video.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Main Cinema Viewport */}
      <div className="relative group">
        <div
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden border-2 sm:border-3 border-ink-900 bg-ink-900 shadow-2xl transition-all duration-300"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Top Stage Bar */}
          <div className="absolute top-3 sm:top-5 left-3 sm:left-5 right-3 sm:right-5 z-30 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-ink-900/95 px-3 sm:px-4 py-1.5 sm:py-2 rounded-pill border sm:border-2 border-white/30 text-xs sm:text-sm font-mono text-white shadow-lg">
                <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-accent-pink animate-ping flex-shrink-0" />
                <span className="font-extrabold text-white tracking-tight truncate max-w-[120px] sm:max-w-none">{activeVideo.title}</span>
                <span className="hidden sm:inline text-accent-yellow font-bold">/</span>
                <span className="hidden sm:inline text-white font-bold">{activeVideo.domain}</span>
              </div>

              {activeVideo.isComingSoon && (
                <span className="bg-accent-yellow border sm:border-2 border-ink-900 text-ink-900 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-pill text-[10px] sm:text-xs font-extrabold uppercase tracking-wider shadow-sm">
                  Soon
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              {activeVideo.url && (
                <a
                  href={activeVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 bg-accent-pink hover:bg-accent-pink/90 text-white font-extrabold px-3 sm:px-4 py-1.5 sm:py-2 rounded-pill text-xs font-mono transition-transform hover:scale-105 shadow-sm"
                >
                  <span>Visit</span>
                  <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Video Container with touch tap to toggle play */}
          <div className="relative aspect-video w-full cursor-pointer bg-ink-900" onClick={togglePlay}>
            <video
              ref={videoRef}
              src={activeVideo.src}
              poster={activeVideo.poster}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover"
            />

            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-accent-pink text-white flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1 fill-current" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Player Controls - Always visible on mobile for easy touch, hover on desktop */}
          <div
            className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-ink-900 via-ink-900/95 to-transparent p-3.5 sm:p-6 transition-opacity duration-200 ${
              isHovered || !isPlaying ? 'opacity-100' : 'opacity-90 sm:opacity-0'
            }`}
          >
            {/* Scrubber */}
            <div
              onClick={handleSeek}
              className="w-full h-2.5 sm:h-2 hover:h-3.5 bg-white/30 rounded-pill cursor-pointer mb-3 sm:mb-4 transition-all relative overflow-hidden"
            >
              <div
                className="h-full bg-accent-pink transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-white text-xs sm:text-sm font-mono font-bold">
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={togglePlay}
                  className="p-2 sm:p-2.5 rounded-xl bg-white/20 hover:bg-accent-pink transition-colors text-white"
                  title={isPlaying ? 'Pause' : 'Play'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 sm:p-2.5 rounded-xl bg-white/20 hover:bg-accent-pink transition-colors text-white"
                  title={isMuted ? 'Unmute' : 'Mute'}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-yellow" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-green" />}
                </button>

                <span className="text-white font-extrabold text-xs sm:text-sm">
                  {currentTime} <span className="text-accent-yellow">/</span> {duration}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3">
                <button
                  onClick={changeSpeed}
                  className="px-2.5 py-1 rounded-pill bg-white/20 hover:bg-white/30 transition-colors text-xs font-bold"
                >
                  {playbackSpeed}x
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 sm:p-2.5 rounded-xl bg-white/20 hover:bg-accent-pink transition-colors text-white"
                  title="Fullscreen"
                  aria-label="Fullscreen"
                >
                  <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Description Callout */}
        <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-surface dark:bg-[#181412] border-2 border-ink-900 dark:border-white/20 p-4 sm:p-6 rounded-2xl shadow-hard">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-sans text-xl sm:text-2xl font-extrabold text-ink-900 dark:text-white">{activeVideo.title}</h3>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-pill bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-bold">
                {activeVideo.domain}
              </span>
            </div>
            <p className="text-sm sm:text-lg text-ink-900 dark:text-[#dcd8d5] mt-1.5 sm:mt-2 max-w-3xl font-medium leading-relaxed">
              {activeVideo.desc}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0">
            <span className={`text-xs font-mono px-3.5 py-1.5 rounded-pill font-extrabold uppercase tracking-wider border-2 border-ink-900 dark:border-white/20 ${activeVideo.accentBadge}`}>
              {activeVideo.tag}
            </span>
          </div>
        </div>
      </div>

      {/* Touch-Swipe Filmstrip Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs sm:text-sm font-mono font-extrabold uppercase tracking-wider text-ink-900 dark:text-white flex items-center gap-1.5">
            <span>Select Production</span>
            <ChevronRight className="w-4 h-4 text-accent-pink sm:hidden" />
          </span>
          <span className="text-xs font-mono text-ink-900 dark:text-white font-bold bg-surface dark:bg-[#181412] px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-pill border border-ink-900 dark:border-white/20">
            5 Releases
          </span>
        </div>

        {/* Mobile Swipe Container / Desktop Grid */}
        <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {videoCatalog.map((v) => {
            const isSelected = activeVideo.id === v.id;
            return (
              <div
                key={v.id}
                onClick={() => setActiveVideo(v)}
                className={`w-[190px] sm:w-auto flex-shrink-0 snap-start group cursor-pointer rounded-2xl overflow-hidden border-2 p-2.5 transition-all duration-200 relative ${
                  isSelected
                    ? 'border-ink-900 dark:border-white/40 bg-surface dark:bg-[#25201d] shadow-hard -translate-y-0.5 ring-2 ring-accent-pink'
                    : 'border-ink-900 dark:border-white/20 bg-white dark:bg-[#181412] hover:bg-surface dark:hover:bg-[#201c19] hover:shadow-md'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-ink-900 mb-2 border border-ink-900">
                  <img
                    src={v.poster}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />

                  <div className="absolute bottom-1 right-1 bg-ink-900 text-white px-2 py-0.5 rounded-pill text-[10px] sm:text-xs font-mono font-bold shadow-sm">
                    {v.duration}
                  </div>

                  {v.isComingSoon && (
                    <div className="absolute top-1 left-1 bg-accent-yellow text-ink-900 text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-pill font-bold uppercase tracking-wider border border-ink-900 shadow-sm">
                      Soon
                    </div>
                  )}
                </div>

                <div className="px-1">
                  <div className="font-extrabold text-xs sm:text-sm text-ink-900 dark:text-white truncate">{v.title}</div>
                  <div className="text-[11px] sm:text-xs font-mono text-ink-900 dark:text-[#dcd8d5] font-bold truncate mt-0.5">{v.domain}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
