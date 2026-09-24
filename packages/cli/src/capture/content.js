// Content extraction.
//
// Design tokens tell us how a site looks. They do not tell us what it says,
// and a film built only from tokens and screenshots looks like a screen
// recording rather than a promo. This pass pulls the things a designer would
// put on a slide: the headline, the supporting statements, a service list,
// any standout numbers, the call to action, and the site's own media.
//
// Using the site's own hero film and photography rather than screenshots of
// the page is the single largest difference between a film that looks
// designed and one that does not.

/**
 * Evaluated inside the page. Must be self contained: it is serialised across
 * the protocol boundary and cannot close over anything in this module.
 */
export function collectContentInPage() {
  /** Text that is boilerplate rather than content. */
  const NOISE = /^(menu|close|open|skip to|cookie|accept|home|toggle|next|previous|back|\d+)$/i;

  /** Words that mark an element as a call to action. */
  const CTA_WORDS = /\b(get in touch|contact|book|enquire|start|work with|hire|let'?s talk|get started|request|discuss)\b/i;

  /** Trim and collapse whitespace. */
  function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  /** Is this element actually painted and on screen? */
  function isVisible(element) {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /** Inline elements that are part of a phrase rather than a container. */
  const INLINE = new Set(['SPAN', 'A', 'B', 'I', 'EM', 'STRONG', 'SMALL', 'SUP', 'SUB', 'MARK', 'BR']);

  /**
   * The text an element is responsible for.
   *
   * Taking only direct text nodes avoids counting a paragraph once for
   * itself and again for every ancestor. But a headline is very often built
   * from one span per word, and ignoring those children reduces
   * "BAR | GRILL | RESTAURANT | LOUNGE" to "Bar | | Restaurant | Lounge",
   * with the spanned words missing and the separators left behind.
   *
   * So an element whose element children are all inline phrasing is treated
   * as one phrase and read whole. Anything containing a block child is
   * still read as only its own text, because that element is a container.
   */
  function ownText(element) {
    const children = Array.from(element.children);
    const phrasing = children.length > 0 && children.every((child) => INLINE.has(child.tagName));

    if (phrasing) return clean(element.textContent);

    return clean(
      Array.from(element.childNodes)
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent)
        .join(' ')
    );
  }

  /** Every visible text bearing element, with the measurements we rank on. */
  function textElements() {
    const results = [];

    for (const element of document.querySelectorAll('h1, h2, h3, h4, p, span, div, li, a, button, strong')) {
      if (!isVisible(element)) continue;

      const text = ownText(element);
      if (text.length < 2 || text.length > 300) continue;
      if (NOISE.test(text)) continue;

      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      results.push({
        text,
        tag: element.tagName.toLowerCase(),
        fontSize: Number.parseFloat(style.fontSize) || 0,
        weight: Number.parseInt(style.fontWeight, 10) || 400,
        uppercase: style.textTransform === 'uppercase',
        letterSpacing: Number.parseFloat(style.letterSpacing) || 0,
        top: Math.round(rect.top + window.scrollY),
        area: Math.round(rect.width * rect.height),
      });
    }

    return results;
  }

  const all = textElements();

  // The headline must come from the opening of the page.
  //
  // Ranking the whole document by font size finds the largest type wherever
  // it sits, which on a long marketing page is usually the closing call to
  // action rather than the hero. Restricting candidates to the first screen
  // and a half is what makes this pick the actual opening statement.
  const heroZone = window.innerHeight * 1.6;

  const sizeable = all
    .filter((entry) => entry.text.length >= 8 && entry.text.length <= 120)
    .filter((entry) => !entry.uppercase || entry.fontSize > 40);

  const headlineCandidates = sizeable
    .filter((entry) => entry.top < heroZone)
    // A button is not a proposition. "BOOK NOW" set large in a hero is a
    // call to action, and using it as the headline makes the film open by
    // shouting an instruction at someone who has not been told anything
    // yet.
    .filter((entry) => !CTA_WORDS.test(entry.text))
    .sort((a, b) => b.fontSize - a.fontSize || a.top - b.top);

  // If nothing large sits in the hero zone, fall back to the whole document
  // rather than returning no headline at all.
  const headline = headlineCandidates[0] ?? sizeable.sort((a, b) => b.fontSize - a.fontSize)[0] ?? null;

  // Supporting statements are the other large pieces of type, kept in
  // document order so the film follows the page's own narrative rather than
  // jumping to whichever line happens to be set largest.
  const seenStatements = new Set(headline ? [headline.text.toLowerCase()] : []);
  const headlineSize = headline ? headline.fontSize : 0;

  const statements = sizeable
    .filter((entry) => entry.fontSize >= 22)
    // Type set at the headline's own size inside the hero zone is the rest
    // of the headline, not a separate statement. Without this the film shows
    // "CRAFTING VISION" and then repeats "INSPIRING TOGETHER" as though it
    // were a project name.
    .filter((entry) => !(entry.top < heroZone && entry.fontSize >= headlineSize * 0.8))
    .sort((a, b) => a.top - b.top)
    .filter((entry) => {
      const key = entry.text.toLowerCase();
      if (seenStatements.has(key)) return false;
      seenStatements.add(key);
      return true;
    })
    .slice(0, 8)
    .map((entry) => ({ text: entry.text, fontSize: entry.fontSize, top: entry.top }));

  // An eyebrow is small, wide tracked, usually uppercase type: the label a
  // designer puts above a headline.
  const eyebrows = all
    .filter((entry) => entry.uppercase || entry.letterSpacing > 1)
    .filter((entry) => entry.fontSize <= 24 && entry.text.length >= 3 && entry.text.length <= 40)
    .sort((a, b) => a.top - b.top)
    .slice(0, 6)
    .map((entry) => entry.text);

  // Service lists: a list whose items are all short. These make the strongest
  // staggered column in a case study scene.
  const lists = [];
  for (const list of document.querySelectorAll('ul, ol')) {
    if (!isVisible(list)) continue;

    // Navigation is not a service list. Without this a film proudly presents
    // "About, Work, Contact" as the client's capabilities.
    if (list.closest('nav, header, footer, [role="navigation"]')) continue;

    const items = Array.from(list.querySelectorAll(':scope > li'))
      .filter(isVisible)
      .map((item) => clean(item.textContent))
      .filter((text) => text.length >= 3 && text.length <= 44 && !NOISE.test(text));

    if (items.length >= 3 && items.length <= 8) {
      lists.push({ items: items.slice(0, 6), top: Math.round(list.getBoundingClientRect().top + window.scrollY) });
    }
  }
  lists.sort((a, b) => a.top - b.top);

  // Standout numbers with the label that sits next to them.
  // The suffix group allows a scale and a qualifier together, so "189K+" is
  // recognised as a figure. Without that, one stat claims the next as its
  // own label.
  const NUMERIC = /^[£$€]?\d[\d,.]*\s*(k|m|bn)?\s*(\+|%)?$/i;
  const stats = [];
  const claimedLabels = new Set();

  for (const entry of all) {
    if (!NUMERIC.test(entry.text)) continue;
    if (entry.fontSize < 28) continue;

    // The label is the caption directly beneath the figure. It must sit
    // strictly below it, be close by, be caption sized rather than a section
    // heading, and not be a figure itself.
    const label = all
      .filter((other) => other.top > entry.top && other.top - entry.top <= 200)
      .filter((other) => other.text !== entry.text && !NUMERIC.test(other.text))
      .filter((other) => other.fontSize <= 28 && other.fontSize < entry.fontSize)
      .filter((other) => other.text.length >= 3 && other.text.length <= 48)
      // A caption already claimed belongs to an earlier figure. Reusing it
      // would print the same label under three different numbers.
      .filter((other) => !claimedLabels.has(other.text.toLowerCase()))
      .sort((a, b) => (a.top - entry.top) - (b.top - entry.top))[0];

    if (label) claimedLabels.add(label.text.toLowerCase());
    stats.push({ value: entry.text, label: label ? label.text : '', top: entry.top });
    if (stats.length >= 4) break;
  }

  // The call to action, taken from a real link or button where possible.
  let cta = null;
  for (const element of document.querySelectorAll('a, button')) {
    if (!isVisible(element)) continue;
    const text = clean(element.textContent);
    if (text.length < 3 || text.length > 40) continue;
    if (!CTA_WORDS.test(text)) continue;
    cta = { text, href: element.getAttribute('href') || null };
    break;
  }

  // The site's own media. This is what makes scenes look designed.
  const media = { videos: [], images: [], ogImage: null };

  const og = document.querySelector('meta[property="og:image"]');
  if (og && og.content) media.ogImage = og.content;

  for (const video of document.querySelectorAll('video')) {
    const source = video.currentSrc || video.src || (video.querySelector('source') || {}).src || '';
    if (!source || !/^https?:/i.test(source)) continue;
    const rect = video.getBoundingClientRect();
    media.videos.push({
      src: source,
      poster: video.poster || null,
      width: video.videoWidth || 0,
      height: video.videoHeight || 0,
      area: Math.round(rect.width * rect.height),
      top: Math.round(rect.top + window.scrollY),
    });
  }
  media.videos.sort((a, b) => b.width * b.height - a.width * a.height);

  const seenImages = new Set();
  for (const image of document.querySelectorAll('img')) {
    const source = image.currentSrc || image.src || '';
    if (!source || !/^https?:/i.test(source)) continue;
    if (seenImages.has(source)) continue;
    seenImages.add(source);

    // Skip anything too small to fill a frame, which rules out icons,
    // avatars, tracking pixels and logos.
    if (image.naturalWidth < 900 || image.naturalHeight < 500) continue;

    media.images.push({
      src: source,
      width: image.naturalWidth,
      height: image.naturalHeight,
      alt: clean(image.alt),
      top: Math.round(image.getBoundingClientRect().top + window.scrollY),
    });
  }
  media.images.sort((a, b) => b.width * b.height - a.width * a.height);
  media.images = media.images.slice(0, 10);

  // The brand name, preferring what the site calls itself over its page title.
  let brand = '';
  const siteName = document.querySelector('meta[property="og:site_name"]');
  if (siteName && siteName.content) brand = clean(siteName.content);
  if (!brand) {
    const logo = document.querySelector('header img[alt], [class*="logo"] img[alt]');
    if (logo) brand = clean(logo.alt);
  }

  // A logo's alt text describes the image, so it routinely ends in the word
  // "logo", "monogram" or "wordmark". Left in, the closing card reads "Work
  // with Kalandula Logo".
  const DESCRIPTOR =
    /[\s|:-]+(logo|logotype|monogram|wordmark|word mark|brandmark|brand mark|icon|emblem|symbol)\.?$/i;

  // Stripping to nothing would be worse than leaving it alone, so a value
  // that is only a descriptor keeps whatever it had.
  const brandName = brand.replace(DESCRIPTOR, '').trim() || brand;

  return {
    brand: brandName,
    title: clean(document.title),
    headline: headline ? headline.text : '',
    statements,
    eyebrows,
    lists,
    stats,
    cta,
    media,
  };
}

/**
 * Clean a page title into something usable as a brand name.
 *
 * Page titles are written for search engines, not for a title card, so
 * "HOME | LuminaryHouse" has to become "LuminaryHouse". Separator segments
 * that are pure navigation words are dropped, and the longest remaining
 * segment wins.
 */
export function cleanTitle(title, fallback = 'Launch') {
  const NAVIGATION = /^(home|homepage|index|welcome|main|start|official site|official website)$/i;

  const segments = String(title ?? '')
    .split(/\s*[|·•–—>»:]\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !NAVIGATION.test(segment));

  if (segments.length === 0) return fallback;

  // Prefer the shortest segment that still looks like a name, because the
  // long segment is usually a description and the brand is the short one.
  const byLength = [...segments].sort((a, b) => a.length - b.length);
  const name = byLength.find((segment) => segment.length >= 3) ?? segments[0];

  return name.length > 48 ? `${name.slice(0, 45).trim()}...` : name;
}

/**
 * Split a headline into balanced lines for a masked reveal.
 *
 * Lines are broken on word boundaries close to an even split, so a two line
 * headline does not end up with five words above one.
 *
 * @param {string} text
 * @param {number} maxLines
 * @param {number} maxCharsPerLine
 * @returns {string[]}
 */
export function splitIntoLines(text, maxLines = 3, maxCharsPerLine = 26) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
      // Everything left over is forced onto the final line rather than
      // silently dropped.
      if (lines.length === maxLines - 1) {
        const rest = words.slice(words.indexOf(word));
        lines.push(rest.join(' '));
        return lines;
      }
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}
