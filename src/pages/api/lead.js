import { validateLead, formatTelegram, sendTelegram } from '../../lib/lead.js';

export const prerender = false;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const recent = new Map();

function tooMany(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > MAX_PER_WINDOW;
}

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST({ request, clientAddress }) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json(415, { ok: false, error: 'json_only' });
  }
  const raw = await request.text();
  if (raw.length > 10_000) return json(413, { ok: false, error: 'too_large' });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'bad_json' });
  }

  const result = validateLead(body);
  if (!result.ok) return json(422, { ok: false, error: 'invalid', fields: result.errors });
  if (result.spam) return json(200, { ok: true });

  if (tooMany(clientAddress ?? 'unknown')) return json(429, { ok: false, error: 'rate_limited' });

  const token = process.env.TELEGRAM_BOT_TOKEN ?? import.meta.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID ?? import.meta.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('Lead not delivered: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set');
    return json(503, { ok: false, error: 'not_configured' });
  }

  try {
    await sendTelegram({ token, chatId, text: formatTelegram(result.data) });
  } catch (err) {
    console.error('Lead not delivered:', err.message);
    return json(502, { ok: false, error: 'delivery_failed' });
  }
  return json(200, { ok: true });
}
