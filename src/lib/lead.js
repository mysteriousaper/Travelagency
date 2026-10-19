// Validates website requests and turns them into Telegram messages.
// Pure functions, so they can be tested without a server.

export const LEAD_TYPES = ['quote', 'visa', 'flight', 'booking', 'callback', 'newsletter'];

const TYPE_TITLES = {
  quote: 'Tour price request',
  visa: 'Visa consultation request',
  flight: 'Flight ticket request',
  booking: 'Office visit request',
  callback: 'Call-back request',
  newsletter: 'Newsletter sign-up',
};

const MAX_DETAILS = 20;
const MAX_TEXT = 500;
const PHONE_RE = /^\+?[\d\s()-]{6,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max = 120) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/**
 * @returns {{ ok: true, spam?: boolean, data: object } | { ok: false, errors: string[] }}
 */
export function validateLead(input) {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['body'] };

  // Bots fill the hidden "website" field; accept quietly and drop the request.
  if (clean(input.website)) return { ok: true, spam: true, data: null };

  const type = clean(input.type, 20);
  const data = {
    type,
    lang: ['hy', 'en', 'ru'].includes(input.lang) ? input.lang : 'hy',
    name: clean(input.name, 100),
    phone: clean(input.phone, 30),
    email: clean(input.email, 120),
    channel: clean(input.channel, 20),
    page: clean(input.page, 200),
    details: {},
  };

  const errors = [];
  if (!LEAD_TYPES.includes(type)) errors.push('type');

  if (type === 'newsletter') {
    if (!EMAIL_RE.test(data.email)) errors.push('email');
  } else {
    if (!data.name) errors.push('name');
    if (!PHONE_RE.test(data.phone)) errors.push('phone');
    if (data.email && !EMAIL_RE.test(data.email)) errors.push('email');
    if (data.channel === 'Email' && !data.email) errors.push('email');
  }

  if (input.details && typeof input.details === 'object' && !Array.isArray(input.details)) {
    for (const [key, value] of Object.entries(input.details).slice(0, MAX_DETAILS)) {
      const k = clean(key, 60);
      const v = clean(String(value ?? ''), MAX_TEXT);
      if (k && v) data.details[k] = v;
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, data };
}

export function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatTelegram(data) {
  const lines = [`<b>${escapeHtml(TYPE_TITLES[data.type] ?? data.type)}</b> · ${data.lang.toUpperCase()}`];
  if (data.name) lines.push(`Name: ${escapeHtml(data.name)}`);
  if (data.phone) lines.push(`Phone: ${escapeHtml(data.phone)}`);
  if (data.email) lines.push(`Email: ${escapeHtml(data.email)}`);
  if (data.channel) lines.push(`Reply via: ${escapeHtml(data.channel)}`);
  const details = Object.entries(data.details ?? {});
  if (details.length) {
    lines.push('');
    for (const [key, value] of details) lines.push(`${escapeHtml(key)}: ${escapeHtml(value)}`);
  }
  if (data.page) lines.push('', `Page: ${escapeHtml(data.page)}`);
  return lines.join('\n');
}

export async function sendTelegram({ token, chatId, text, fetchImpl = fetch }) {
  const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram responded ${res.status}`);
}
