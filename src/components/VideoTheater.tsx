import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink, Radio } from 'lucide-react';

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

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const changeSpeed = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    video.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  return (
    <div className="space-y-8">
      {/* Main Cinema Viewport */}
      <div className="relative group">
        <div
          className="relative rounded-2xl overflow-hidden border-2 border-ink-900 bg-ink-900 shadow-2xl transition-all duration-300"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Top Stage Bar */}
          <div className="absolute top-5 left-5 right-5 z-30 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-ink-900 px-4 py-2 rounded-pill border-2 border-white/30 text-sm font-mono text-white shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-pink animate-ping" />
                <span className="font-extrabold text-white tracking-tight">{activeVideo.title}</span>
                <span className="text-accent-yellow font-bold">/</span>
                <span className="text-white font-bold">{activeVideo.domain}</span>
              </div>

              {activeVideo.isComingSoon && (
                <span className="bg-accent-yellow border-2 border-ink-900 text-ink-900 px-3.5 py-1.5 rounded-pill text-xs font-extrabold uppercase tracking-wider shadow-hard">
                  Coming Soon
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-ink-900 px-4 py-2 rounded-pill border-2 border-white/30 text-sm font-mono text-white">
                <Radio className="w-4 h-4 text-accent-green" />
                <span className="font-bold">{activeVideo.fps}</span>
              </div>

              {activeVideo.url && (
                <a
                  href={activeVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto flex items-center gap-1.5 bg-accent-pink hover:bg-accent-pink/90 text-white font-extrabold px-4 py-2 rounded-pill text-xs font-mono transition-transform hover:scale-105 shadow-hard"
                >
                  <span>Visit Site</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Video Container */}
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
                <div className="w-24 h-24 rounded-full bg-accent-pink text-white flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                  <Play className="w-10 h-10 ml-1.5 fill-current" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Player Controls */}
          <div
            className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-ink-900 via-ink-900/90 to-transparent p-6 transition-opacity duration-200 ${
              isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Scrubber */}
            <div
              onClick={handleSeek}
              className="w-full h-2 hover:h-3 bg-white/30 rounded-pill cursor-pointer mb-4 transition-all relative overflow-hidden"
            >
              <div
                className="h-full bg-accent-pink transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-white text-sm font-mono font-bold">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="p-2.5 rounded-xl bg-white/20 hover:bg-accent-pink transition-colors text-white"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2.5 rounded-xl bg-white/20 hover:bg-accent-pink transition-colors text-white"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <span className="text-white font-extrabold text-sm sm:text-base">
                  {currentTime} <span className="text-accent-yellow">/</span> {duration}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={changeSpeed}
                  className="px-3 py-1.5 rounded-pill bg-white/20 hover:bg-white/30 transition-colors text-xs font-bold"
                >
                  {playbackSpeed}x
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2.5 rounded-xl bg-white/20 hover:bg-accent-pink transition-colors text-white"
                  title="Fullscreen"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Description Callout */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border-2 border-ink-900 p-6 rounded-2xl shadow-hard">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-sans text-2xl font-extrabold text-ink-900">{activeVideo.title}</h3>
              <span className="text-xs font-mono px-3 py-1 rounded-pill bg-ink-900 text-white font-bold">
                {activeVideo.domain}
              </span>
            </div>
            <p className="text-base sm:text-lg text-ink-900 mt-2 max-w-3xl font-medium leading-relaxed">
              {activeVideo.desc}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-mono px-4 py-2 rounded-pill font-extrabold uppercase tracking-wider border-2 border-ink-900 ${activeVideo.accentBadge}`}>
              {activeVideo.tag}
            </span>
          </div>
        </div>
      </div>

      {/* Filmstrip Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-mono font-extrabold uppercase tracking-wider text-ink-900">
            Select Video Production
          </span>
          <span className="text-sm font-mono text-ink-900 font-bold bg-surface px-3 py-1 rounded-pill border border-ink-900">
            5 Curated Releases
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {videoCatalog.map((v) => {
            const isSelected = activeVideo.id === v.id;
            return (
              <div
                key={v.id}
                onClick={() => setActiveVideo(v)}
                className={`group cursor-pointer rounded-2xl overflow-hidden border-2 p-2.5 transition-all duration-200 relative ${
                  isSelected
                    ? 'border-ink-900 bg-surface shadow-hard -translate-y-1 ring-2 ring-accent-pink'
                    : 'border-ink-900 bg-white hover:bg-surface hover:shadow-md'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-ink-900 mb-2.5 border border-ink-900">
                  <img
                    src={v.poster}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />

                  <div className="absolute bottom-1.5 right-1.5 bg-ink-900 text-white px-2.5 py-0.5 rounded-pill text-xs font-mono font-bold shadow-sm">
                    {v.duration}
                  </div>

                  {v.isComingSoon && (
                    <div className="absolute top-1.5 left-1.5 bg-accent-yellow text-ink-900 text-[10px] font-mono px-2 py-0.5 rounded-pill font-bold uppercase tracking-wider border border-ink-900 shadow-sm">
                      Soon
                    </div>
                  )}
                </div>

                <div className="px-1">
                  <div className="font-extrabold text-sm text-ink-900 truncate">{v.title}</div>
                  <div className="text-xs font-mono text-ink-900 font-bold truncate mt-0.5">{v.domain}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
