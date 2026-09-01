export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  ALLOWED_ORIGIN: string;
}

interface ForwardRequestBody {
  imageUrls: string[];
  pageUrl: string;
}

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const SEND_DELAY_MS = 350;
// Guardrail against a single request burning through the free-tier quota.
const MAX_IMAGES = 20;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    let body: ForwardRequestBody;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
    }

    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((entry): entry is string => typeof entry === 'string').slice(0, MAX_IMAGES)
      : [];
    const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl : '';

    if (imageUrls.length === 0 || !pageUrl) {
      return new Response('"imageUrls" (non-empty array) and "pageUrl" are required', {
        status: 400,
        headers: corsHeaders,
      });
    }

    try {
      for (const [index, imageUrl] of imageUrls.entries()) {
        if (index > 0) await delay(SEND_DELAY_MS);
        await callTelegram(env, 'sendPhoto', { chat_id: env.TELEGRAM_CHAT_ID, photo: imageUrl });
      }

      await callTelegram(env, 'sendMessage', {
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `[link](${pageUrl})`,
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
        disable_web_page_preview: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sent: imageUrls.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};

async function callTelegram(env: Env, method: string, payload: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Telegram ${method} failed: ${response.status} ${detail}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
