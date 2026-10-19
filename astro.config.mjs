import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Pages are pre-built as static HTML. Only /api/lead runs on the server,
// so the site needs a Node host (any VPS, Render, Railway, Fly…).
// To host on Vercel or Netlify instead, swap this adapter for theirs.
export default defineConfig({
  site: 'https://example.com', // [PLACEHOLDER: your domain]
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'ignore',
});
