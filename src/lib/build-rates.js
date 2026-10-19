// Central Bank of Armenia rates fetched once at build time and embedded in every page,
// so the currency switch also works on static hosting where /api/rates doesn't exist.
import { fetchRates } from './cba.js';

let cached;
export async function buildRates() {
  if (cached === undefined) {
    try {
      cached = await fetchRates();
    } catch (err) {
      console.warn('Build-time exchange rates unavailable:', err.message);
      cached = null;
    }
  }
  return cached;
}
