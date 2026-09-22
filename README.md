# Launch · Instant Cinema Video Engine for Modern Web Projects

Turn any web project into an unwatermarked 60fps promo video directly from your local codebase or live URL. Extract computed design tokens and true motion physics in seconds.

## Features

- **Automated Style & Palette Extraction**: Analyzes computed CSSOM and DOM style trees to extract exact colour palettes, typographic scales, font stacks, and layout geometry directly from your codebase.
- **True Cubic-Bezier Motion Choreography**: Samples transition curves, damping parameters, and scroll triggers directly from source styles for true-to-life UI animation and smooth scene handoffs.
- **Deterministic 60fps Master Rendering**: Frame-accurate Chromium renderer running locally with hardware GPU acceleration. Renders crystal-clear 1080p and 4K masters without dropped frames.
- **Multi-Aspect Ratio Output Matrix**: Render in 16:9 Landscape for web showcases, 9:16 Vertical for mobile reels and social feeds, or 1:1 Square in a single unified pipeline pass.
- **Frame-0 Baked Poster Engine**: Automatically identifies the settled hero frame and bakes it into frame 0 of the MP4 using FFmpeg for instant preview loading without black flash.
- **Dynamic Audio Beds & Voiceover Carving**: Automated track gain control, volume envelopes, and dynamic ducking to balance background music cleanly behind voice narration.

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom Design System
- **Animation & Physics**: GSAP + Lenis Smooth Scroll + Three.js
- **Icons**: Lucide React
- **Typography**: Hanken Grotesk Variable + JetBrains Mono

## Development

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```

## Licence

MIT &middot; Created by [Snurm](https://github.com/SadikMohamud)
