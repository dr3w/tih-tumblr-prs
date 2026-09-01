/**
 * Forwards scraped images to a public Telegram channel via a small
 * server-side relay (see telegram-relay/), instead of calling the Telegram
 * Bot API directly from the browser.
 *
 * The bot token is a full credential, and this app has no backend of its
 * own — anything sent from the browser is visible to whoever holds the
 * page's URL. There's no way to make "the browser holds the token" secure.
 * The relay is the fix: it holds the token as a server-side secret and is
 * the only thing that ever calls the Telegram API. This file only ever
 * sends it the image URLs and the page URL — never a credential.
 *
 * See telegram-relay/README.md for how to deploy the relay, then set
 * RELAY_URL below to the deployed Worker's URL.
 */

const RELAY_URL = ''; // e.g. 'https://tih-tumblr-telegram-relay.<subdomain>.workers.dev'

export function isRelayConfigured(): boolean {
  return RELAY_URL.length > 0;
}

export async function sendToTelegramRelay(imageUrls: string[], pageUrl: string): Promise<void> {
  const response = await fetch(RELAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrls, pageUrl }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Telegram relay failed: ${response.status} ${detail}`);
  }
}
