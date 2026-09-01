import { fetchFinalPage } from './fetchPage';
import { extractImageUrls } from './parseImages';
import { isValidPostUrl } from './validate';
import { renderError, renderResult, renderTelegramStatus } from './render';
import { resolveTelegramTarget, sendImages, sendPageLink } from './telegram';

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

    await forwardToTelegram(imageUrls, finalUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    renderError(502, message);
  }
}

async function forwardToTelegram(imageUrls: string[], pageUrl: string): Promise<void> {
  const target = resolveTelegramTarget(window.location.search, window.location.hash);
  if (!target) return;

  if (imageUrls.length === 0) {
    renderTelegramStatus('No images matched; nothing sent to Telegram.');
    return;
  }

  try {
    await sendImages(target, imageUrls);
    await sendPageLink(target, pageUrl);
    renderTelegramStatus(`Sent ${imageUrls.length} image(s) to Telegram.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    renderTelegramStatus(`Telegram send failed: ${message}`);
  }
}

function normalizeUrl(rawUrl: string): string {
  return /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
}

void main();
