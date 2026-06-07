import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyUserAgent } from '../lib/request-security';

test('classifies common crawler and automation user agents', () => {
  assert.equal(classifyUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)'), 'known_bot');
  assert.equal(classifyUserAgent('Mozilla/5.0 HeadlessChrome Playwright'), 'automation');
  assert.equal(classifyUserAgent('Mozilla/5.0 (iPhone; Mobile)'), 'mobile');
  assert.equal(classifyUserAgent('Mozilla/5.0 Chrome/136 Safari/537.36'), 'desktop');
});
