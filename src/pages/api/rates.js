import { fetchRates } from '../../lib/cba.js';

export const prerender = false;

const ONE_HOUR = 60 * 60 * 1000;
let cache = null; // { rates, date, at }

export async function GET() {
  if (!cache || Date.now() - cache.at > ONE_HOUR) {
    try {
      cache = { ...(await fetchRates()), at: Date.now() };
    } catch (err) {
      console.error('Exchange rates unavailable:', err.message);
      // Keep serving the last good rates if we have them.
      if (!cache) return new Response(JSON.stringify({ ok: false }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
  }
  return new Response(JSON.stringify({ ok: true, source: 'Central Bank of Armenia', date: cache.date, rates: cache.rates }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
  });
}
