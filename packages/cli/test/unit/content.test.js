// Unit tests for the pure parts of content extraction.
//
// The in-page collector needs a browser, but the helpers it feeds do not,
// and they are where the mistakes that reach the screen actually live.

import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTitle, splitIntoLines } from '../../src/capture/content.js';

test('cleanTitle strips navigation segments from a page title', () => {
  assert.equal(cleanTitle('HOME | LuminaryHouse'), 'LuminaryHouse');
  assert.equal(cleanTitle('Welcome · The Forge'), 'The Forge');
  assert.equal(cleanTitle('Index – Kalandula'), 'Kalandula');
});

test('cleanTitle prefers the short segment, which is the name', () => {
  assert.equal(
    cleanTitle('Kalandula | Bar, grill and restaurant in south London'),
    'Kalandula'
  );
});

test('cleanTitle falls back rather than returning nothing', () => {
  assert.equal(cleanTitle(''), 'Launch');
  assert.equal(cleanTitle('Home'), 'Launch');
  assert.equal(cleanTitle(undefined, 'Fallback'), 'Fallback');
});

test('cleanTitle truncates a title too long for a card', () => {
  const long = 'A'.repeat(80);
  assert.ok(cleanTitle(long).length <= 48);
  assert.match(cleanTitle(long), /\.\.\.$/);
});

test('splitIntoLines balances a headline across lines', () => {
  const lines = splitIntoLines('Considered spaces for considered people', 2, 22);
  assert.equal(lines.length, 2);
  for (const line of lines) assert.ok(line.trim().length > 0);
});

test('splitIntoLines never drops words', () => {
  const text = 'One command turns any website into a finished promo film';
  const joined = splitIntoLines(text, 3, 20).join(' ');
  for (const word of text.split(' ')) {
    assert.ok(joined.includes(word), `lost the word "${word}"`);
  }
});

test('splitIntoLines respects the line limit', () => {
  const lines = splitIntoLines('a b c d e f g h i j k l m n o p', 2, 6);
  assert.ok(lines.length <= 2);
});

test('splitIntoLines handles empty and single word input', () => {
  assert.deepEqual(splitIntoLines(''), []);
  assert.deepEqual(splitIntoLines('Launch'), ['Launch']);
});
