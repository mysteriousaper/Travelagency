import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLead, formatTelegram, sendTelegram } from '../src/lib/lead.js';

const base = { type: 'quote', lang: 'en', name: 'Anna', phone: '+374 99 12 34 56', channel: 'WhatsApp' };

test('accepts a normal quote request', () => {
  const r = validateLead({ ...base, details: { Destination: 'Dubai' } });
  assert.equal(r.ok, true);
  assert.equal(r.data.details.Destination, 'Dubai');
});

test('rejects a missing name and a bad phone', () => {
  const r = validateLead({ ...base, name: ' ', phone: 'call me' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors, ['name', 'phone']);
});

test('rejects unknown types', () => {
  assert.equal(validateLead({ ...base, type: 'admin' }).ok, false);
});

test('requires an email when the reply channel is Email', () => {
  assert.deepEqual(validateLead({ ...base, channel: 'Email' }).errors, ['email']);
  assert.equal(validateLead({ ...base, channel: 'Email', email: 'a@b.am' }).ok, true);
});

test('newsletter needs only a valid email', () => {
  assert.equal(validateLead({ type: 'newsletter', email: 'a@b.am' }).ok, true);
  assert.equal(validateLead({ type: 'newsletter', email: 'nope' }).ok, false);
});

test('honeypot requests are marked as spam', () => {
  const r = validateLead({ ...base, website: 'http://spam' });
  assert.equal(r.ok, true);
  assert.equal(r.spam, true);
});

test('caps the number and length of details', () => {
  const details = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, 'x'.repeat(900)]));
  const r = validateLead({ ...base, details });
  assert.equal(Object.keys(r.data.details).length, 20);
  assert.equal(r.data.details.k0.length, 500);
});

test('escapes HTML in the Telegram message', () => {
  const r = validateLead({ ...base, name: '<b>Eve</b>', details: { Notes: 'a & b' } });
  const text = formatTelegram(r.data);
  assert.match(text, /Name: &lt;b&gt;Eve&lt;\/b&gt;/);
  assert.match(text, /Notes: a &amp; b/);
  assert.match(text, /^<b>Tour price request<\/b> · EN/);
});

test('sendTelegram posts to the bot API and throws on failure', async () => {
  let called;
  const fetchImpl = async (url, opts) => { called = { url, body: JSON.parse(opts.body) }; return { ok: true }; };
  await sendTelegram({ token: 'T', chatId: '42', text: 'hi', fetchImpl });
  assert.equal(called.url, 'https://api.telegram.org/botT/sendMessage');
  assert.equal(called.body.chat_id, '42');
  await assert.rejects(sendTelegram({ token: 'T', chatId: '42', text: 'hi', fetchImpl: async () => ({ ok: false, status: 400 }) }));
});
