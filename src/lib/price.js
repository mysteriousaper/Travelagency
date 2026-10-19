// Tour offers and prices. An offer's price is in AMD unless it says otherwise (e.g. currency: USD).

export function offersOf(tour) {
  return Array.isArray(tour.offers) ? tour.offers.filter((o) => typeof o.price === 'number') : [];
}

/** The lowest offer price in the first offer's currency, or null when there are no priced offers. */
export function fromPrice(tour) {
  const offers = offersOf(tour);
  if (!offers.length) return null;
  const currency = offers[0].currency ?? 'AMD';
  const same = offers.filter((o) => (o.currency ?? 'AMD') === currency);
  return { amount: Math.min(...same.map((o) => o.price)), currency };
}

export function formatPrice(amount, currency, lang) {
  return new Intl.NumberFormat(lang, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
