import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRates, fetchRates } from '../src/lib/cba.js';

const xml = `<ExchangeRatesLatestResult><CurrentDate>2026-10-19T00:00:00</CurrentDate><Rates>
<ExchangeRate><ISO>USD</ISO><Amount>1</Amount><Rate>361.36</Rate><Difference>-0.1</Difference></ExchangeRate>
<ExchangeRate><ISO>EUR</ISO><Amount>1</Amount><Rate>405.41</Rate></ExchangeRate>
<ExchangeRate><ISO>RUB</ISO><Amount>1</Amount><Rate>4.3731</Rate></ExchangeRate>
<ExchangeRate><ISO>JPY</ISO><Amount>10</Amount><Rate>24.1</Rate></ExchangeRate>
</Rates></ExchangeRatesLatestResult>`;

test('reads USD, EUR and RUB and the date', () => {
  const r = parseRates(xml);
  assert.deepEqual(r.rates, { USD: 361.36, EUR: 405.41, RUB: 4.3731 });
  assert.equal(r.date, '2026-10-19');
});

test('divides by Amount when the bank quotes per 10 or 100 units', () => {
  const r = parseRates('<ExchangeRate><ISO>RUB</ISO><Amount>10</Amount><Rate>43.731</Rate></ExchangeRate>');
  assert.equal(r.rates.RUB, 4.3731);
});

test('fetchRates fails when a currency is missing', async () => {
  const fetchImpl = async () => ({ ok: true, text: async () => '<ExchangeRate><ISO>USD</ISO><Amount>1</Amount><Rate>361</Rate></ExchangeRate>' });
  await assert.rejects(fetchRates(fetchImpl), /missing/);
  const ok = await fetchRates(async () => ({ ok: true, text: async () => xml }));
  assert.equal(ok.rates.EUR, 405.41);
});
