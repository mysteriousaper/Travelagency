# King Travel website

The website for King Travel, 62 Teryan St, Yerevan. It is in Armenian, English and Russian.

- **Pages:** home, tours (a list plus one page per destination), visas, flights, and office/contact.
- **Requests:** every form sends the request to your Telegram chat. That covers tour prices, visa consultations, flight fares, office visits, call-backs and newsletter sign-ups.
- **Editing:** all texts, tours and settings live in plain `.yaml` files in `content/`. Changing them doesn't require touching the code.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
cp .env.example .env        # then fill in the Telegram values (see below)
npm run dev                 # opens http://localhost:4321
```

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Builds the site into `dist/` |
| `npm start` | Runs the built site (after `npm run build`) |
| `npm test` | Tests the request checks and the Telegram message |

## Get requests in Telegram

1. In Telegram, message **@BotFather**, send `/newbot` and follow the steps. Copy the **token** it gives you.
2. Add the bot to your staff group, or just send it a message yourself.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser. Find `"chat":{"id": ...}` and copy that number (group ids start with `-`).
4. Put both values in `.env`, or in your host's environment settings:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_CHAT_ID=-100123456789
   ```

Until these are set, forms show "Couldn't send, write to us on WhatsApp" and the server logs a warning.

## Edit the content

Anything still written as `[PLACEHOLDER: ...]` shows on the site with a yellow highlight, so you can see what's left. Texts written as `{ en: ..., hy: ..., ru: ... }` show the matching language.

| File | What's in it |
|---|---|
| `content/site.yaml` | Phones, WhatsApp, Telegram, email, address, hours, licence, social links, reviews, office visit times |
| `content/tours/*.yaml` | One file per destination: name, description, photo, flight, visa, price |
| `content/visas.yaml` | Visa document checklists |
| `content/faq.yaml` | Questions and answers |
| `content/ui.yaml` | Every button, heading and label in the three languages |

**Add a destination:** copy `content/tours/_template.yaml.example` to `content/tours/<name>.yaml` and fill it in. Put its photo in `public/images/tours/`. It then appears automatically in the tour list, search, footer and its own page.

**Prices:** set `price_from_amd: 450000` in a tour file. Leave it empty to show "Price on request". Visitors can switch prices to $, € or ₽. The site converts them with the official rates of the Central Bank of Armenia, which it fetches automatically every hour.

After editing, rebuild and redeploy (`npm run build`). If the site is connected to the repository on a host like Render, pushing the change is enough.

**Before launch, have a native speaker check the Armenian and Russian texts.** They are drafts.

## Hosting

The pages are static HTML. Only `/api/lead` (the form endpoint) runs on a server, so the site needs a Node.js host. Any VPS, [Render](https://render.com) or [Railway](https://railway.app) works:

- Build command: `npm install && npm run build`
- Start command: `npm start` (listens on `PORT`, default 4321; set `HOST=0.0.0.0` on most hosts)
- Environment variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

To host on Vercel or Netlify instead, replace the Node adapter in `astro.config.mjs` with theirs. Also set `site:` in that file to your real domain.

## Photos

- **Sharm El Sheikh, Dubai, Paris, Venice and flight photos:** Unsplash stock images, free to use with no credit needed.
- **Doha, Rome, Prague and Barcelona photos:** from Wikimedia Commons under Creative Commons licences. Their licences require the photographer credit, which the site shows on the photo (`image_credit` in each tour file). If you replace a photo with your own, clear those two fields.
- **Still needed:** photos of your office and team.

## How it's built

- [Astro](https://astro.build) 5. Pages are built from `src/pages/[lang]/...` for each language.
- `src/lib/content.js` loads the YAML files and `src/lib/i18n.js` handles the languages.
- `src/lib/lead.js` checks requests and formats the Telegram message (covered by `tests/`).
- `src/pages/api/rates.js` serves the Central Bank of Armenia rates (fetched by `src/lib/cba.js`, cached for an hour).
- `src/pages/api/lead.js` is the form endpoint. It has a hidden bot trap, a size limit and a simple per-visitor rate limit.
- `src/scripts/site.js` is the browser script for tabs, chips, the request dialog, office slots, the currency switch and form sending.
