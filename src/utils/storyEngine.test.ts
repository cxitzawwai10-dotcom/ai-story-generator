import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStoryMetrics,
  sanitizeFilename,
  segmentStoryIntoParts,
  extractStoryTitle,
  formatFullStoryForExport,
  redactSecrets,
  selectNextKey,
  KeyRecord,
  GeneratedStory
} from './storyEngine';

test('calculateStoryMetrics computes correct words and parts', () => {
  const m15 = calculateStoryMetrics(15, 'Minutes');
  assert.equal(m15.totalMinutes, 15);
  assert.equal(m15.targetWords, 15 * 140);
  assert.equal(m15.recommendedParts, 3);
  assert.equal(m15.label, '15 Minutes');

  const m90 = calculateStoryMetrics(90, 'Minutes');
  assert.equal(m90.totalMinutes, 90);
  assert.equal(m90.targetWords, 90 * 140);
  assert.equal(m90.recommendedParts, 15);

  const h2 = calculateStoryMetrics(2, 'Hours');
  assert.equal(h2.totalMinutes, 120);
  assert.equal(h2.targetWords, 120 * 140);
});

test('sanitizeFilename handles special characters and Burmese Unicode correctly', () => {
  const englishName = sanitizeFilename('The Secret of Golden Lake', '2026-11-09');
  assert.equal(englishName, 'StoryVerse_The_Secret_of_Golden_Lake_2026-11-09.txt');

  const burmeseName = sanitizeFilename('ရွှေရွာရဲ့လျှို့ဝှက်ဆန်းကြယ်မှု', '2026-11-09');
  assert.match(burmeseName, /^StoryVerse_ရွှေရွာရဲ့လျှို့ဝှက်ဆန်းကြယ်မှု_2026-11-09\.txt$/);

  const dirtyName = sanitizeFilename('Danger: "Special" / <Tags> & *Stars*!', '2026-11-09');
  assert.ok(!dirtyName.includes('"') && !dirtyName.includes('*') && !dirtyName.includes('<'));
});

test('segmentStoryIntoParts parses explicit parts or splits paragraphs smoothly', () => {
  const explicitText = `
TITLE: The Echoes of Bagan
Part-1: The Silent Temple
Once upon a time in ancient Bagan, the morning mist swept across the pagodas.
Part-2: The Hidden Relic
Inside the subterranean chamber, a faint glow illuminated the stone inscription.
Part-3: The Final Choice
With the sun setting over the Ayeyarwady River, the guardian completed the ritual.
  `.trim();

  const explicitParts = segmentStoryIntoParts(explicitText, 3);
  assert.equal(explicitParts.length, 3);
  assert.equal(explicitParts[0].number, 1);
  assert.ok(explicitParts[0].title.includes('Part-1'));
  assert.ok(explicitParts[1].text.includes('Inside the subterranean'));

  // Test paragraph fallback
  const rawParagraphs = `
Paragraph 1 details setting the scene.

Paragraph 2 introduces the conflict.

Paragraph 3 brings a twist.

Paragraph 4 resolves the mystery.
  `.trim();

  const fallbackParts = segmentStoryIntoParts(rawParagraphs, 2);
  assert.equal(fallbackParts.length, 2);
  assert.equal(fallbackParts[0].number, 1);
  assert.equal(fallbackParts[1].number, 2);
});

test('extractStoryTitle finds title reliably', () => {
  const text1 = 'TITLE: The Ghost of Shan Hills\n\nPart 1...\nIt was cold.';
  assert.equal(extractStoryTitle(text1), 'The Ghost of Shan Hills');

  const text2 = 'ခေါင်းစဉ်: မြူခိုးတွေကြားကအိမ်ကြီး\n\nအပိုင်း ၁...';
  assert.equal(extractStoryTitle(text2), 'မြူခိုးတွေကြားကအိမ်ကြီး');
});

test('formatFullStoryForExport produces a complete file with all parts', () => {
  const mockStory: GeneratedStory = {
    id: 'story-123',
    title: 'The Whispering Bamboo',
    idea: 'A traveler gets lost in an old bamboo forest.',
    genre: 'Mystery',
    background: 'မြန်မာ့ကျေးလက်နောက်ခံ',
    duration: '20 Minutes',
    durationMinutes: 20,
    parts: [
      { number: 1, title: 'Part-1: The Bamboo Maze', text: 'Thick stalks rose toward the twilight.' },
      { number: 2, title: 'Part-2: The Guardian Monk', text: 'A lantern appeared in the clearing.' }
    ],
    rawText: '',
    createdAt: '2026-11-09T08:00:00Z'
  };

  const exported = formatFullStoryForExport(mockStory);
  assert.ok(exported.includes('TITLE: The Whispering Bamboo'));
  assert.ok(exported.includes('GENRE: Mystery'));
  assert.ok(exported.includes('မြန်မာ့ကျေးလက်နောက်ခံ'));
  assert.ok(exported.includes('TOTAL PARTS: 2'));
  assert.ok(exported.includes('[PART-1: THE BAMBOO MAZE]'));
  assert.ok(exported.includes('Thick stalks rose toward the twilight.'));
  assert.ok(exported.includes('[PART-2: THE GUARDIAN MONK]'));
  assert.ok(exported.includes('A lantern appeared in the clearing.'));
});

test('redactSecrets sanitizes API keys from text', () => {
  const secret = 'AIzaSyA1234567890abcdef1234567890abcdef';
  const log = `Request failed using key=${secret} with status 400`;
  const sanitized = redactSecrets(log);

  assert.ok(!sanitized.includes(secret));
  assert.ok(sanitized.includes('[REDACTED_API_KEY]') || sanitized.includes('key=[REDACTED]'));
});

test('selectNextKey rotates and respects cooldowns', () => {
  const now = 10000;
  const keys: KeyRecord[] = [
    {
      id: 'Key-01',
      key: 'key-1-value',
      status: 'QuotaExceeded',
      reqState: 'Cooldown',
      lastTest: '-',
      lastUsed: '-',
      requests: 1,
      success: 0,
      errors: 1,
      cooldownUntil: now + 5000 // In cooldown
    },
    {
      id: 'Key-02',
      key: 'key-2-value',
      status: 'Standby',
      reqState: 'Idle',
      lastTest: '-',
      lastUsed: '-',
      requests: 0,
      success: 0,
      errors: 0,
      cooldownUntil: 0 // Ready
    }
  ];

  const selection = selectNextKey(keys, 0, now);
  assert.ok(selection !== null);
  assert.equal(selection.key.id, 'Key-02');
  assert.equal(selection.nextIndex, 1);
});
