---
name: launch
description: Make a promo or launch video for a website, web app or product from its project code, its live URL, or both. Renders unwatermarked 60fps cinema masters with computed design tokens and true motion physics.
---

# /launch

One command for launch videos. Extract computed design tokens, stage multi-scene choreography, and render 60fps unwatermarked MP4 masters with baked frame-0 posters.

## Usage

```bash
/launch                                     # short video from current project folder (15-25s)
/launch https://example.com                 # 4K promo video from live URL
/launch https://example.com --long          # extended 30 to 90 second narrative showcase
/launch --format vertical --tone cinematic  # 9:16 vertical video for mobile reels
```

| Option | Values | Default | Description |
|---|---|---|---|
| URL | any public https URL | none | Target live website or application |
| `--long` | flag | short | Extended narrative flow (30-90s) |
| `--format` | `landscape`, `vertical`, `square` | `landscape` | Aspect ratio (`16:9`, `9:16`, `1:1`) |
| `--tone` | `cinematic`, `clean`, `energetic` | `cinematic` | Motion pacing and color grade |
| `--duration` | seconds | 15 to 25 | Total target video duration |
| `--no-music` | flag | false | Disable background music bed |

## House Rules

- UK spelling throughout (`colour`, `visualise`, `optimise`, `licence`).
- Zero em dashes.
- Zero watermarks or AI tool attribution.
- Frame 0 poster baked into MP4 via FFmpeg.
