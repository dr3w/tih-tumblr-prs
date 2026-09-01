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
that.
