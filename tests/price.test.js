import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromPrice, offersOf } from '../src/lib/price.js';

test('no offers means no "from" price', () => {
  assert.equal(fromPrice({}), null);
  assert.equal(fromPrice({ offers: [{ title: 'x' }] }), null);
});

test('"from" is the lowest price in the first offer\'s currency', () => {
  const tour = { offers: [{ price: 275000 }, { price: 145000 }, { price: 400, currency: 'USD' }] };
  assert.deepEqual(fromPrice(tour), { amount: 145000, currency: 'AMD' });
  assert.deepEqual(fromPrice({ offers: [{ price: 449, currency: 'USD' }] }), { amount: 449, currency: 'USD' });
  assert.equal(offersOf(tour).length, 3);
});
