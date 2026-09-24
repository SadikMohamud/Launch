# Design sources

Every visual and motion decision on the Launch site traces to one of two
places: a reference in MiMic, or a component in the Awwwards pack at
`C:\Users\Sadik\OneDrive\Desktop\Awwwards Pack`.

This file exists to be checked. Every MiMic id below can be queried, and
every pack path below has been verified to exist on disk. Nothing is listed
that was not actually opened and read.

**On the pack's licence.** The pack carries no licence, so none of its code
is copied. Each mechanic records the file that was studied, a one line
summary of how that component works, and what our version does differently.
Where a pack component depends on paid GSAP plugins or on Three.js, ours
does not.

---

## Design direction

The chosen direction is **Filmstock**: a near black canvas with a violet
cast, lit by three saturated colours used as light rather than as flat fill.

Three directions were presented. The two not chosen are recorded here
because their references were genuinely queried and rejected on merit.

| Direction | MiMic references | Outcome |
|---|---|---|
| A, "Darkroom" | `114` caskexchange.com, `104` dulcedo.com, `188` rga.com | Not chosen. The most beautiful and the slowest; its 1200ms median duration reads as luxury rather than as a tool. |
| B, "Signal" | `264` ethnocare.ca, `343` curtisdesignr.me, `89` unity.com | Chosen as the structural base, then re-coloured. See below. |
| C, "Press" | `462` and `465` lxlcreative.co.uk, `33` coderesolution.com | Not chosen. Warm and editorial, but reads as a studio site rather than an engine. |

**Why B was re-coloured.** Direction B as presented was black, white and one
cyan, taken from reference `264`. Built, it read as an austere developer
tool, which is the opposite of what the product makes. The structure, type
scale and motion signature from `264` were kept; the palette was replaced.

---

## Colour

The primary accent is not a taste decision and not taken from a reference.
`#ee3390` is the colour **Launch's own pixel sampler extracted from
luminaryhouse.co.uk**, so the page is coloured by the tool it sells. It can
be reproduced:

```
launch https://luminaryhouse.co.uk --tokens-only
```

and read back from `colour.accent.hex` in the resulting tokens file.

| Token | Value | Source |
|---|---|---|
| `--canvas` | `#070509` | Near black with a violet cast. Scheme taken from MiMic `264`, whose canvas covers 97.3% of painted area. |
| `--text` | `#f6f4f8` | MiMic `264` text colour, 80.7% of text. |
| `--muted` | `#aaa4b4` | Derived, not referenced. See the contrast note below. |
| `--film` | `#ee3390` | Extracted by the engine from luminaryhouse.co.uk. |
| `--flare` | `#ff8a3d` | Chosen to complete the grade; verified at 8.65:1 on the canvas. |
| `--signal` | `#2fe0b0` | Descended from `264`'s `#00f5f3`, deepened for the darker canvas. |

**Contrast.** Every pair was measured before use, against the brightest
pixel the WebGL backdrop can produce, not merely against the flat canvas.
Reference `264` uses `#666666` for muted text, which measures 3.66:1 on
black and fails AA; it was not copied. Three values are ours rather than the
reference's for this reason:

| Token | On canvas | Over backdrop |
|---|---|---|
| `--text` `#f6f4f8` | 18.57:1 | 11.85:1 |
| `--muted` `#aaa4b4` | 8.39:1 | 5.35:1 |
| `--accent-text` `#ff6fb0` | 7.88:1 | 5.03:1 |
| `--flare` `#ff8a3d` | 8.65:1 | 5.52:1 |
| `--signal` `#2fe0b0` | 11.99:1 | 7.66:1 |

`#ee3390` is kept exactly as extracted wherever it is a fill. As small text
over the backdrop it measures 3.40:1, so text uses the same hue lifted to
`#ff6fb0`. The extracted value is not quietly changed; it is kept where
contrast rules do not apply and lifted where they do.

---

## Typography and motion

| Decision | Source | Measured value |
|---|---|---|
| Type scale | MiMic `264` | 208 / 64 / 32 / 16 / 12, ratio 1.265, a major third |
| Display face | MiMic `264` uses PP Monument Extended | Commercial, so Archivo at `wdth 125` substitutes |
| Body face | MiMic `264` uses Helvetica Now Display | Inter substitutes |
| Entrance curve | MiMic `264` | `cubic-bezier(0.165, 0.84, 0.44, 1)`, 144 uses on the reference |
| Entrance duration | MiMic `264` | 450ms median |
| Stagger interval | MiMic `264` | 61ms |
| Scrub curve | MiMic `220` | `cubic-bezier(0.22, 1, 0.36, 1)`, 350ms median |
| Scrub trigger | MiMic `220` | 0.53 of viewport height |

---

## Sections

| Section | References | What was taken |
|---|---|---|
| Intro reveal (`PageReveal`) | Supplied `Launch-Loadscreen.zip`; MiMic `140` and `264` both show `intro-sequence` | The camera slate, ring progress and clip-path wipe. The click gate was removed, it was rethemed, and its randomised progress steps were fixed so the sequence can be snapshot tested. |
| Hero (`HeroSection`) | Pack `+26 Hero Animations/3, 11, 19, 23` (preview frames); MiMic `264` | Full bleed media behind a held wordmark, and the idea from hero 23 of oversized type overlapping its own media. Our film is graded into the page palette so it reads as lighting. |
| Proof (`ProofTheatre`) | MiMic `140` work index, `188` rga.com | A flat, square cornered media grid with one accent, rather than rounded cards. |
| Colour bands (`ColourBand`) | MiMic `140` hugeinc.com, `220` k95.it | Both put bold colour in dedicated full bleed bands carrying only display type, keeping reading sections calm. That is why the saturated colour lives here and not behind body copy. |
| Process (`PinnedProcess`) | MiMic `220`, which pins its team section across 8.43vh; pack `+57 Scroll Animation/31` | Pin and scrub structure. |
| Install, flags, FAQ | MiMic `89` unity.com, `90` docs.unity3d.com | Compact type scale and a flat, hairline separated grid for dense technical content. |
| Platform and waitlist | MiMic `250` keyword.com | A single bounded panel for the pitch and its form, rather than a full width band. |

---

## Mechanics

| Mechanic | Pack file studied | How that component works | How ours differs |
|---|---|---|---|
| `SplitReveal` | `+14 Text Animations/4/code.zip` → `files/script.js` | Splits a paragraph into characters with GSAP `SplitText`, caches each character's centre, marks the cache dirty on resize, and throttles a pointer loop to a set frame rate. | Ours splits in plain DOM with no runtime dependency. The pack version needs `SplitText` and `ScrambleTextPlugin`. Ours plays a one shot rise out of a mask on scroll rather than a continuous pointer scramble, on our own 450ms / 61ms timing. |
| `ScrollWordReveal` | None. Built from MiMic `220` and `140` | `220` wraps each word in a `gsap-word-reveal-wrap` / `gsap-word-reveal` pair and scrubs opacity and transform against scroll over about 1.3vh, using six CSS scroll timelines. | Ours uses native `animation-timeline: view()` so the scrub costs no JavaScript per frame, and falls back to one IntersectionObserver reveal at the same trigger point where unsupported. |
| `CustomCursor` | `+19 Mouse Effect/6/code.zip` → `files/script.js` | Fills a full screen canvas, switches to `destination-out`, and erases circles along the pointer path, interpolating between positions using `movementX` and `movementY` so fast movement leaves no gaps. | Ours keeps the interpolation and drops the canvas entirely: one small ring easing towards the pointer, one transform per frame instead of a full screen repaint. It never hides the system cursor, which the pack version does. |
| `MagneticButton` | `+24 Hover Effects/5/code.zip` → `3DLettersMenuHover-main/js/menuItem.js` | Tracks the pointer against each item's bounding box and drives a per letter 3D transform, re-measuring on pointer enter. | Ours measures once per hover and expresses the pull as a fraction of the element's own size. No per letter split and no 3D rotation. Arms only on a fine pointer with motion allowed. |
| `TiltCard` | `+24 Hover Effects/5/code.zip` → `3DLettersMenuHover-main/js/menu.js` | Puts perspective on the container and rotates children from the pointer's normalised offset. | Ours tilts one surface on two axes with our easing and keeps children untransformed so text stays crisp. |
| `PinnedProcess` | `+57 Scroll Animation/31/code.zip` → `src/dual-wave/DualWaveAnimation.js` | Builds a ScrollTrigger from `top bottom` to `bottom top`, recalculates ranges on resize, and drives transforms from scroll progress rather than from a clock. | Ours scrubs the product explanation rather than a decorative wave of repeated text, and falls back to a stacked list under reduced motion where pinning is hostile. |
| `ColourBand` | `+57 Scroll Animation/31/code.zip`, plus the supplied loadscreen for the wipe shape | As above. | Ours scrubs a parallax offset and a drifting wordmark against the band's own scroll range. |
| `HugeCanvas` | `+19 Webgl _ ThreeJS Effects/3/code.zip` → `src/glsl/gooeyShader.glsl`; `+19 Webgl _ ThreeJS Effects/8/code.zip` → `js/shader/fragment.glsl` | Both build a full screen field from noise with aspect corrected coordinates, scaling time right down so motion reads as drift, with smoothstep falloff for soft shapes. | Both are built on Three.js, roughly 150KB gzipped, which would consume the page's whole JavaScript budget. Ours talks to WebGL2 directly, draws one triangle from `gl_VertexID`, and costs 2.82KB gzipped. Its noise is a compact hash fbm written here rather than `glsl-noise`. It also clamps its own luminance so text contrast is guaranteed, which neither pack component does. |

---

## Verification

```bash
# Every pack path above
ls "C:\Users\Sadik\OneDrive\Desktop\Awwwards Pack\+14 Text Animations\4\code.zip"

# Every MiMic id above, through the MCP
search_references / get_reference with the id
```

Both were re-verified on 24 September 2026. The pack contains 14 category
folders; the six components cited here were extracted and read in full.
