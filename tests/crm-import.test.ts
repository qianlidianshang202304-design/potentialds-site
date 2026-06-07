import assert from 'node:assert/strict';
import test from 'node:test';
import {
  importNumber,
  normalizeImportPlatform,
  normalizeImportStatus,
} from '../lib/crm-import';

test('normalizes common platform aliases', () => {
  assert.equal(normalizeImportPlatform('IG'), 'instagram');
  assert.equal(normalizeImportPlatform('Tik Tok'), 'tiktok');
  assert.equal(normalizeImportPlatform('YT'), 'youtube');
});

test('normalizes Chinese and English CRM statuses', () => {
  assert.equal(normalizeImportStatus('已发送'), 'sent');
  assert.equal(normalizeImportStatus('NEGOTIATING'), 'negotiating');
  assert.equal(normalizeImportStatus('已合作'), 'partnered');
  assert.equal(normalizeImportStatus('未知状态'), 'to_contact');
});

test('parses formatted creator metrics', () => {
  assert.equal(importNumber('12,345 followers'), 12345);
  assert.equal(importNumber('98.7'), 98);
  assert.equal(importNumber(''), null);
});
