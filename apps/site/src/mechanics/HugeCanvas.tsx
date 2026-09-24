// Ambient WebGL backdrop.
//
// Studied: "Awwwards Pack/+19 Webgl _ ThreeJS Effects/3/code.zip"
// (src/glsl/gooeyShader.glsl) and ".../8/code.zip"
// (js/shader/fragment.glsl). Both build a full screen field from noise with
// aspect corrected coordinates and scale time right down (u_time * 0.05) so
// the motion reads as drift rather than animation. Cross-checked against
// k95.it (MiMic 220), whose WebGL scene covers the whole viewport.
//
// What we took: the aspect correction, the heavily damped time, and
// smoothstep falloff for soft light rather than hard shapes.
//
// What we changed, and it is the reason this file exists at all: both pack
// components are built on Three.js, which is roughly 150KB gzipped and
// would consume the page's entire JavaScript budget on its own. This talks
// to WebGL2 directly, draws a single full screen triangle, and adds about
// three kilobytes. The noise is a compact hash based fbm written here
// rather than pulled from glsl-noise, so there is no shader build step.
//
// It renders at half resolution, which is invisible on a field this soft
// and quarters the fragment cost; it stops entirely when the tab is hidden;
// and it reads its three colours from the stylesheet so the backdrop
// follows the theme without knowing the palette.

import React, { useEffect, useRef } from 'react';

const VERTEX = `#version 300 es
// One oversized triangle covers the viewport with no vertex buffer at all:
// the positions are derived from gl_VertexID.
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_film;
uniform vec3 u_flare;
uniform vec3 u_signal;
uniform vec3 u_canvas;

out vec4 outColour;

// Cheap hash noise. Good enough for a soft field and far smaller than a
// proper simplex implementation.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Four octaves is the point where more detail stops being visible through
// the blur and starts only costing fragments.
float fbm(vec2 p) {
  float total = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    total += noise(p) * amplitude;
    p *= 2.02;
    amplitude *= 0.5;
  }
  return total;
}

// A soft pool of light, falling off smoothly from its centre.
float pool(vec2 uv, vec2 centre, float radius) {
  float d = length(uv - centre);
  return 1.0 - smoothstep(0.0, radius, d);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv;
  p.x *= u_res.x / u_res.y;

  // Time is damped hard. The field should drift, not animate.
  float t = u_time * 0.016;

  // Warp the sampling position so the pools breathe instead of sliding.
  float warp = fbm(p * 1.4 + vec2(t, -t * 0.7));
  vec2 wp = p + vec2(warp - 0.5) * 0.45;

  float a = pool(wp, vec2(0.28 + sin(t * 0.7) * 0.06, 0.74 + cos(t * 0.5) * 0.05), 0.62);
  float b = pool(wp, vec2(0.82 + cos(t * 0.45) * 0.07, 0.22 + sin(t * 0.6) * 0.06), 0.55);
  float c = pool(wp, vec2(0.52 + sin(t * 0.35) * 0.09, 0.48 + cos(t * 0.4) * 0.07), 0.48);

  vec3 colour = u_canvas;
  colour += u_film * a * 0.85;
  colour += u_flare * b * 0.62;
  colour += u_signal * c * 0.48;

  // A little grain keeps the gradients from banding on dark panels. It is
  // added before the clamp, not after: grain applied afterwards pushes the
  // result back over the ceiling, which measured 0.0333 against a 0.0293
  // limit and dropped muted text to 4.29:1.
  colour += (hash(gl_FragCoord.xy + t) - 0.5) * 0.012;

  // Clamp the backdrop's luminance rather than its brightness.
  //
  // Three overlapping pools can coincide on one pixel, and summed they
  // lift the background far enough that the muted body colour drops below
  // the WCAG AA ratio. Dimming the pools until that cannot happen leaves
  // the field invisible, so instead the result is scaled down only by as
  // much as its own luminance demands. Hue stays fully saturated; only
  // luminance is capped.
  //
  // The ceiling is derived, not guessed: muted #9a94a3 has a relative
  // luminance of 0.3069, and (0.3069 + 0.05) / 4.5 - 0.05 = 0.02932 is the
  // brightest background that still clears 4.5:1 against it. A small margin
  // is held back for the 8 bit rounding the framebuffer applies afterwards.
  const float MAX_LUMA = 0.0270;

  vec3 lin = pow(max(colour, 0.0), vec3(2.2));
  float luma = dot(lin, vec3(0.2126, 0.7152, 0.0722));
  if (luma > MAX_LUMA) {
    colour = pow(lin * (MAX_LUMA / luma), vec3(1.0 / 2.2));
  }

  // Vignette, so the field never competes with the copy at the edges.
  float v = 1.0 - smoothstep(0.62, 1.42, length(uv - 0.5) * 1.6);
  colour = mix(u_canvas, colour, v);

  outColour = vec4(colour, 1.0);
}`;

/** Read a CSS colour token as linear 0..1 RGB for the shader. */
function readColour(name: string, fallback: [number, number, number]): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const match = raw.match(/^#([0-9a-f]{6})$/i);
  if (!match) return fallback;

  const value = Number.parseInt(match[1], 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

/** Compile a shader, returning null rather than throwing on failure. */
function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export const HugeCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });

    // No WebGL2 means no backdrop. The page is designed to read without it,
    // so this fails quietly rather than falling back to something worse.
    if (!gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);

    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uFilm = gl.getUniformLocation(program, 'u_film');
    const uFlare = gl.getUniformLocation(program, 'u_flare');
    const uSignal = gl.getUniformLocation(program, 'u_signal');
    const uCanvas = gl.getUniformLocation(program, 'u_canvas');

    const applyPalette = () => {
      gl.uniform3fv(uFilm, readColour('--film', [0.93, 0.2, 0.56]));
      gl.uniform3fv(uFlare, readColour('--flare', [1, 0.54, 0.24]));
      gl.uniform3fv(uSignal, readColour('--signal', [0.18, 0.88, 0.69]));
      gl.uniform3fv(uCanvas, readColour('--canvas', [0.027, 0.02, 0.035]));
    };

    // Half resolution. On a field this soft the difference is invisible and
    // it quarters the number of fragments.
    const SCALE = 0.5;

    const resize = () => {
      const width = Math.max(1, Math.floor(window.innerWidth * SCALE));
      const height = Math.max(1, Math.floor(window.innerHeight * SCALE));

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      gl.viewport(0, 0, width, height);
      gl.uniform2f(uRes, width, height);
    };

    let frame = 0;
    let running = true;
    const started = performance.now();

    const draw = () => {
      if (!running) return;
      gl.uniform1f(uTime, (performance.now() - started) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        frame = requestAnimationFrame(draw);
      }
    };

    // The palette changes with the theme, so the backdrop is told rather
    // than left showing the previous theme's colours.
    const themeObserver = new MutationObserver(applyPalette);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    applyPalette();
    resize();
    frame = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
};
