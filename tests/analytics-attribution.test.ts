import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyTrafficSource,
  safeAnalyticsText,
  safeCountryCode,
} from '../lib/analytics-attribution';

test('classifies UTM and referral traffic sources', () => {
  assert.equal(classifyTrafficSource(null, 'google', 'cpc'), 'paid');
  assert.equal(classifyTrafficSource(null, 'agency', 'partner'), 'partner');
  assert.equal(classifyTrafficSource(null, 'newsletter', 'email'), 'campaign');
  assert.equal(classifyTrafficSource('https://www.google.com/search?q=x', null, null), 'organic');
  assert.equal(classifyTrafficSource('https://www.instagram.com/', null, null), 'social');
  assert.equal(classifyTrafficSource('https://example.com/article', null, null), 'referral');
  assert.equal(classifyTrafficSource(null, null, null), 'direct');
});

test('sanitizes analytics dimensions', () => {
  assert.equal(safeCountryCode('us'), 'US');
  assert.equal(safeCountryCode('unknown'), null);
  assert.equal(safeAnalyticsText('  newsletter  '), 'newsletter');
  assert.equal(safeAnalyticsText(''), null);
});
