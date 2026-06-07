import assert from 'node:assert/strict';
import test from 'node:test';
import { crmStatusForEmailEvent, nextEmailStatus } from '../lib/email-tracking';

test('engagement status never moves backwards', () => {
  assert.equal(nextEmailStatus('clicked', 'delivered'), 'clicked');
  assert.equal(nextEmailStatus('replied', 'opened'), 'replied');
  assert.equal(nextEmailStatus('replied', 'clicked'), 'replied');
  assert.equal(nextEmailStatus('opened', 'clicked'), 'clicked');
});

test('delivery failures and recipient actions are terminal', () => {
  assert.equal(nextEmailStatus('clicked', 'bounced'), 'bounced');
  assert.equal(nextEmailStatus('unsubscribed', 'delivered'), 'unsubscribed');
  assert.equal(nextEmailStatus('complained', 'clicked'), 'complained');
});

test('only engagement events advance the creator CRM', () => {
  assert.equal(crmStatusForEmailEvent('delivered'), null);
  assert.equal(crmStatusForEmailEvent('opened'), 'opened');
  assert.equal(crmStatusForEmailEvent('clicked'), 'clicked');
  assert.equal(crmStatusForEmailEvent('replied'), 'replied');
});
