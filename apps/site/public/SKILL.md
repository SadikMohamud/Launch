---
name: launch
description: Generate an unwatermarked 60fps cinema promo video from your local repository or live URL using computed design tokens and true motion physics.
---

# /launch · Instant Cinema Promo Video Engine

## Usage

In Claude Code, Antigravity, or terminal:

```bash
/launch [target] [options]
```

### Examples
- `/launch` : Generate 15-25s promo from current codebase.
- `/launch https://kalandula.co.uk` : Capture and generate promo from live URL.
- `/launch https://luminaryhouse.co.uk --long` : 30-90s multi-scene narrative.
- `/launch --format vertical --tone cinematic` : 9:16 mobile reel.

## Requirements
- Node.js >= 20.0.0
- FFmpeg with H.264 & AAC support
- Local GPU acceleration recommended
