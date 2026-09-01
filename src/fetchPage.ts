export interface FetchedPage {
  /** The URL after following all redirects. */
  finalUrl: string;
  html: string;
}

/**
 * Fetches `url`, following redirects, and returns the final resolved URL
 * alongside the response body. Relies on `fetch`'s default redirect
 * behavior and `Response.url` to observe where the browser landed.
 *
 * Note: this only works for targets that send permissive CORS headers,
 * since the request runs in the browser from a different origin.
 */
export async function fetchFinalPage(url: string): Promise<FetchedPage> {
  const response = await fetch(url, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return { finalUrl: response.url, html };
}
