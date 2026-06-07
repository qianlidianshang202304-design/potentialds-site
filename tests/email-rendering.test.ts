import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyEmailVariables,
  escapeHtml,
  extractTrackedLinks,
  replaceTrackedLink,
  safeEmailHeaderValue,
} from '../lib/email-rendering';

test('escapes variables used inside email HTML', () => {
  const variables = { creator_name: escapeHtml('<img src=x onerror=alert(1)>') };
  assert.equal(
    applyEmailVariables('<p>{{creator_name}}</p>', variables),
    '<p>&lt;img src=x onerror=alert(1)&gt;</p>',
  );
});

test('removes header injection characters', () => {
  assert.equal(safeEmailHeaderValue('Hello\r\nBcc: victim@example.com'), 'HelloBcc: victim@example.com');
});

test('extracts and replaces only http and https links', () => {
  const result = extractTrackedLinks(
    '<a href="https://example.com/a">A</a><a href="mailto:test@example.com">Mail</a>',
  );
  assert.equal(result.links.length, 1);
  assert.equal(result.links[0].target, 'https://example.com/a');
  assert.match(result.html, /__PDS_LINK_0__/);
  assert.match(result.html, /mailto:test@example.com/);
  assert.match(
    replaceTrackedLink(result.html, result.links[0].placeholder, 'https://potentialds.cn/api/email/click/1'),
    /https:\/\/potentialds\.cn\/api\/email\/click\/1/,
  );
});
