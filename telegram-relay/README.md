# telegram-relay

A minimal Cloudflare Worker that holds the Telegram bot token as a
server-side secret and forwards images to one fixed channel. This is what
keeps the token out of the static site entirely — see the root README's
"Security: the Telegram bot token" section for why that matters.

Free tier: 100,000 requests/day, no credit card required to sign up.

## One-time setup

1. **Create a free Cloudflare account** (if you don't have one):
   https://dash.cloudflare.com/sign-up — email + password, no card needed.

2. **Install dependencies and log in:**

   ```
   cd telegram-relay
   npm install wrangler --save-dev
   npx wrangler login
   ```

   This opens a browser tab to authorize Wrangler against your account.

3. **Set the bot token as a secret** (never written to a file, so it can't
   end up in git):

   ```
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   ```

   Paste the token from [@BotFather](https://t.me/BotFather) when prompted.

4. **Edit `wrangler.toml`** and set:
   - `TELEGRAM_CHAT_ID` to your channel's id (e.g. `-1001234567890`) or
     `@username`. The bot must already be an admin of that channel.
   - `ALLOWED_ORIGIN` to the origin your GitHub Pages site is served from
     (e.g. `https://<user>.github.io` — note: origin only, no path).

5. **Deploy:**

   ```
   npx wrangler deploy
   ```

   Wrangler prints the Worker's URL, something like:

   ```
   https://tih-tumblr-telegram-relay.<your-subdomain>.workers.dev
   ```

6. **Point the site at it**: put that URL into `RELAY_URL` in
   `../src/telegram.ts`, then commit and push to `main` — the existing
   GitHub Actions workflow rebuilds and redeploys the Pages site.

## Updating

Change `src/index.ts` or `wrangler.toml`, then `npx wrangler deploy` again.
The secret survives redeploys — you only set it once (or again if rotating
the token).

## What this buys you

The browser never sees `TELEGRAM_BOT_TOKEN` — it only ever calls this
Worker with `{ imageUrls, pageUrl }`. The Worker is the only thing that
holds the token, calls the Telegram API, and it only ever posts to the one
channel configured in `TELEGRAM_CHAT_ID`. `ALLOWED_ORIGIN` stops other
sites' JavaScript from using your Worker via CORS, though the endpoint URL
itself is still publicly reachable (Workers are public by default) — an
acceptable tradeoff here since a request to it can only ever do the one
thing it's built for: post to your own public channel.
