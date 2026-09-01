import { fetchFinalPage } from './fetchPage';
import { extractImageUrls } from './parseImages';
import { isValidPostUrl } from './validate';
import { renderError, renderResult } from './render';

async function main(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const rawUrl = params.get('url');

  if (!rawUrl) {
    renderError(400, 'Missing required "url" query parameter.');
    return;
  }

  const targetUrl = normalizeUrl(rawUrl);

  try {
    const { finalUrl, html } = await fetchFinalPage(targetUrl);

    if (!isValidPostUrl(finalUrl)) {
      renderError(400, `Final URL "${finalUrl}" does not match https://thisisnthappiness.com/post/*`);
      return;
    }

    const imageUrls = await extractImageUrls(html, finalUrl);
    renderResult(200, imageUrls);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    renderError(502, message);
  }
}

function normalizeUrl(rawUrl: string): string {
  return /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
}

void main();
