// Loads the editable YAML files in /content at build time.
import { parse } from 'yaml';

const files = import.meta.glob('/content/*.yaml', { query: '?raw', import: 'default', eager: true });
const tourFiles = import.meta.glob('/content/tours/*.yaml', { query: '?raw', import: 'default', eager: true });

function load(name) {
  const raw = files[`/content/${name}.yaml`];
  if (raw === undefined) throw new Error(`content/${name}.yaml is missing`);
  return parse(raw);
}

export const site = load('site');
export const ui = load('ui');
export const visas = load('visas').countries;

export const faq = load('faq').items.filter((item) => !item.social || site.social_packages_enabled);

export const tours = Object.entries(tourFiles)
  .map(([path, raw]) => {
    const tour = parse(raw);
    for (const key of ['slug', 'kind', 'name']) {
      if (!tour[key]) throw new Error(`${path}: "${key}" is required`);
    }
    return tour;
  })
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

const slugs = new Set();
for (const tour of tours) {
  if (slugs.has(tour.slug)) throw new Error(`Two tours use the slug "${tour.slug}"`);
  slugs.add(tour.slug);
}

export const REGIONS = ['sea', 'gulf', 'europe'];
