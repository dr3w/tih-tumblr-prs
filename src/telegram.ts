/**
 * Forwards scraped images to a public Telegram channel.
 *
 * SECURITY: the bot token is a full credential — anyone holding it can post
 * as the bot anywhere it's been added, not just this channel. This app has
 * no backend, so it cannot keep the token secret from whoever holds the
 * page's URL; there is no way to make this fully secure with a pure static
 * site. What we do here to limit exposure while keeping the "pass it as a
 * URL param" requirement:
 *
 *  - The token is read from the URL *fragment* (`#telegramToken=...`), not
 *    the query string. Fragments are never sent to any server: not in the
 *    request line, not in the `Referer` header when the page (or an <img>
 *    it fetches) navigates elsewhere. Query params — `telegramChat` here —
 *    don't carry that risk the same way, since a chat id/username alone
 *    doesn't grant control of anything.
 *  - This only blocks *network* leakage (server/proxy logs, Referer,
 *    analytics). It does nothing about browser history, shoulder-surfing,
 *    or the link being copy-pasted/screenshotted — anyone with the full URL
 *    still has the token.
 *
 * The only way to make this genuinely secure is to stop sending the token
 * to the browser at all: put it as a server-side secret behind a minimal
 * relay (a Cloudflare Worker / Netlify or Vercel function / Lambda URL)
 * that this page calls with just a channel identifier, and have the relay
 * hold the token and call the Telegram API itself. See README for details.
 * That's the recommended fix; this file implements the best available
 * mitigation under the "static site, URL params" constraint as given.
 *
 * Also assumes api.telegram.org responds with permissive CORS headers, the
 * same open assumption fetchPage.ts makes about the scraped site.
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org';

// Telegram applies flood limits per chat; a short gap between sends avoids
// tripping them when forwarding several images in a row.
const SEND_DELAY_MS = 350;

export interface TelegramTarget {
  token: string;
  /** Numeric chat id (e.g. -1001234567890) or @channelusername. */
  chatId: string;
}

/**
 * Reads telegramChat from the query string and telegramToken from the URL
 * fragment. Returns null if either is missing, since both are required to
 * send anything.
 */
export function resolveTelegramTarget(search: string, hash: string): TelegramTarget | null {
  const chatId = new URLSearchParams(search).get('telegramChat');
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('telegramToken');

  if (!chatId || !token) return null;
  return { chatId, token };
}

async function callTelegramApi(token: string, method: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Telegram ${method} failed: ${response.status} ${detail}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sends each image as its own photo message — not a grouped album. */
export async function sendImages(target: TelegramTarget, imageUrls: string[]): Promise<void> {
  for (const [index, imageUrl] of imageUrls.entries()) {
    if (index > 0) await delay(SEND_DELAY_MS);
    await callTelegramApi(target.token, 'sendPhoto', {
      chat_id: target.chatId,
      photo: imageUrl,
    });
  }
}

/** Sends the page URL as a short "link" hyperlink, with previews disabled. */
export async function sendPageLink(target: TelegramTarget, pageUrl: string): Promise<void> {
  await callTelegramApi(target.token, 'sendMessage', {
    chat_id: target.chatId,
    text: `[link](${pageUrl})`,
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
    disable_web_page_preview: true,
  });
}
