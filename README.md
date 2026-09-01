# tih-tumblr-prs

this isn't happiness (tumblr)

A static single-page app that scrapes a thisisnthappiness.com Tumblr post
for images.

## Usage

Open the deployed page with a `url` query parameter pointing at (or
redirecting to) a post:

```
https://<user>.github.io/tih-tumblr-prs/?url=some-site.com/content
```

The page:

1. fetches `url`, following redirects
2. checks that the final URL matches `https://thisisnthappiness.com/post/*`
   (400 if not)
3. parses the page and returns image URLs above the "MORE YOU MIGHT LIKE"
   block, if present, that are larger than 200x200 — otherwise every image
   on the page that is at least 200x200
4. renders the result as JSON on the page, as a stand-in for a `200 OK`
   response body (a static page can't set an HTTP status)

### Forwarding images to Telegram

Add `telegramChat` (query param) and `telegramToken` (URL **fragment**, not
a query param — see Security below) to also forward the found images to a
Telegram channel:

```
https://<user>.github.io/tih-tumblr-prs/?url=some-site.com/content&telegramChat=@mychannel#telegramToken=123456:ABC-DEF...
```

- `telegramChat`: the channel's numeric id (e.g. `-1001234567890`) or its
  `@username`. The bot must already be an admin of this channel.
- `telegramToken`: a bot token from [@BotFather](https://t.me/BotFather).

If both are present, each matched image is sent as its own `sendPhoto`
message (not grouped into an album), followed by one final message
containing just `[link](<page url>)` with link previews disabled. If
either is missing, Telegram forwarding is skipped and the page behaves as
in feature 1.

## Development

```
npm install
npm run dev        # local dev server
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run build        # typecheck + production build to dist/
```

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which lints, builds,
and publishes `dist/` to GitHub Pages. One-time setup: in the repo's
Settings → Pages, set "Source" to "GitHub Actions".

## Limitations

This is a purely client-side static site with no backend. Fetching an
arbitrary external page from the browser is subject to CORS: it only works
if the target site's response allows cross-origin reads. thisisnthappiness.com
may not send those headers, in which case the fetch will fail in the browser
even though the URL is valid — a CORS proxy would be needed to work around
that. The same applies to `api.telegram.org`: this assumes it responds with
permissive CORS headers, which is true for the Bot API today but isn't
guaranteed.

## Security: the Telegram bot token

A Telegram bot token is a full credential — anyone who has it can post as
that bot anywhere it's been added, not just to the one channel you intend.
**This app has no backend, so it cannot truly keep that token secret from
anyone who has the page's URL.** There is no way to make "pass secrets as
URL params on a static site" fully secure; the best that's achievable here
is limiting how the token can leak.

What's implemented, given that constraint:

- The token is read from the URL **fragment** (`#telegramToken=...`), not
  the query string. Fragments are never transmitted to a server — not in
  the request itself, not in the `Referer` header sent when the page (or
  an `<img>` it loads) makes a request to another origin. `telegramChat`
  stays a plain query param since a channel id/username alone doesn't
  grant control of anything.
- This blocks *network*-level leakage: it won't end up in GitHub Pages'
  fronting CDN logs, analytics, or a `Referer` header. It does **not**
  protect against browser history, someone reading over your shoulder, or
  the link being copy-pasted or screenshotted — anyone with the full URL
  still has full control of the bot.

Given that, also:

- Use a bot dedicated to this one channel and nothing else, so a leaked
  token's blast radius is "someone can post to a channel that's already
  public" rather than access to other chats the bot administers.
- Treat generated links as sensitive and short-lived; don't bookmark or
  share them. Rotate the token via @BotFather if a link is ever exposed.

**The actually secure fix** is to stop sending the token to the browser at
all: hold it as a server-side secret behind a small relay (a Cloudflare
Worker, a Netlify/Vercel function, or a Lambda function URL — no full
backend needed), have this page call the relay with only the channel id
and image URLs, and let the relay call the Telegram API itself. That's a
small addition on top of the static site, not a rewrite, and it's the only
way the token stops being exposed to whoever holds the link. Worth doing
before pointing this at a bot token you care about.
