// Official exchange rates from the Central Bank of Armenia (api.cba.am, SOAP).

export const CBA_URL = 'https://api.cba.am/exchangerates.asmx';
export const CURRENCIES = ['USD', 'EUR', 'RUB'];

const ENVELOPE = '<?xml version="1.0" encoding="utf-8"?>'
  + '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
  + '<soap:Body><ExchangeRatesLatest xmlns="http://www.cba.am/" /></soap:Body></soap:Envelope>';

/** Dram per one unit of each currency, plus the date the bank set them for. */
export function parseRates(xml) {
  const rates = {};
  for (const block of xml.match(/<ExchangeRate>[\s\S]*?<\/ExchangeRate>/g) ?? []) {
    const iso = block.match(/<ISO>([A-Z]{3})<\/ISO>/)?.[1];
    const amount = Number(block.match(/<Amount>([\d.]+)<\/Amount>/)?.[1] ?? 1);
    const rate = Number(block.match(/<Rate>([\d.]+)<\/Rate>/)?.[1]);
    if (CURRENCIES.includes(iso) && rate > 0 && amount > 0) rates[iso] = rate / amount;
  }
  const date = xml.match(/<CurrentDate>(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  return { rates, date };
}

export async function fetchRates(fetchImpl = fetch) {
  const res = await fetchImpl(CBA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '"http://www.cba.am/ExchangeRatesLatest"' },
    body: ENVELOPE,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`CBA responded ${res.status}`);
  const parsed = parseRates(await res.text());
  if (!CURRENCIES.every((c) => parsed.rates[c])) throw new Error('CBA response is missing rates');
  return parsed;
}
