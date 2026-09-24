/** Tailwind configuration.
 *
 * Every colour resolves to a CSS custom property rather than a literal, so
 * the light theme is a single class on <html> and no component carries two
 * sets of colour classes. The properties themselves live in index.css.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],

  // The theme is switched by a class on <html>, not by the media query, so
  // the toggle can override the system preference.
  darkMode: ['class', 'html.light &'],

  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        ink: 'var(--text)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        film: 'var(--film)',
        flare: 'var(--flare)',
        signal: 'var(--signal)',
        line: 'var(--line)',
      },

      fontFamily: {
        display: ["'Archivo Variable'", 'system-ui', 'sans-serif'],
        sans: ["'Inter Variable'", 'system-ui', '-apple-system', 'sans-serif'],
        mono: ["'JetBrains Mono Variable'", 'ui-monospace', 'monospace'],
      },

      fontSize: {
        hero: ['var(--t-hero)', { lineHeight: '0.85', letterSpacing: '-0.06em' }],
        display: ['var(--t-display)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        title: ['var(--t-title)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        ui: ['var(--t-ui)', { lineHeight: '1.2', letterSpacing: '0.18em' }],
      },

      spacing: {
        gutter: 'var(--gutter)',
        section: 'var(--section)',
      },

      maxWidth: {
        wrap: '1440px',
        prose: '62ch',
        lead: '44ch',
      },

      transitionTimingFunction: {
        signal: 'var(--ease-signal)',
        settle: 'var(--ease-settle)',
      },

      transitionDuration: {
        signal: '450ms',
      },

      borderColor: {
        DEFAULT: 'var(--line)',
      },
    },
  },

  plugins: [],
};
