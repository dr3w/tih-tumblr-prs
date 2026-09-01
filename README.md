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

Once `telegram-relay/` is deployed and its URL is set in `src/telegram.ts`
(see `telegram-relay/README.md`), every successful lookup also forwards
the matched images to the one Telegram channel the relay is configured
for — no extra URL params needed. Each image is sent as its own `sendPhoto`
message (not grouped into an album), followed by one final message
containing just `[link](<page url>)` with link previews disabled. If the
relay isn't configured yet, forwarding is skipped and the page behaves as
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
This app has no backend of its own, so it cannot hold that token itself;
anything the static site holds directly is visible to whoever has the
page's URL.

The fix is `telegram-relay/`: a small, free Cloudflare Worker that holds
the token as a server-side secret and is the only thing that ever calls
the Telegram API. The browser only ever sends it `{ imageUrls, pageUrl }`
— never a credential. See `telegram-relay/README.md` to deploy it (free
tier, no credit card, ~5 commands).

Also worth doing regardless: use a bot dedicated to this one channel and
nothing else, so if the token is ever compromised (e.g. a leaked
Cloudflare secret), the blast radius is "someone can post to a channel
that's already public" rather than access to other chats the bot
administers.
