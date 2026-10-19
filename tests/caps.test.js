import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caps } from '../src/lib/caps.js';

test('caps spells the Armenian "և" so CSS uppercase gives ԵՎ, not ԵՒ', () => {
  assert.equal('և'.toLocaleUpperCase('hy'), 'ԵՒ');
  assert.equal(caps('Արև և ծով').toLocaleUpperCase('hy'), 'ԱՐԵՎ ԵՎ ԾՈՎ');
  assert.equal(caps('Ուղևորներ').toLocaleUpperCase('hy'), 'ՈՒՂԵՎՈՐՆԵՐ');
  assert.equal(caps('Sun & Sea'), 'Sun & Sea');
});
