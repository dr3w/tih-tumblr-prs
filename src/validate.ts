const POST_URL_PATTERN = /^https:\/\/thisisnthappiness\.com\/post\/.+/i;

/** Matches https://thisisnthappiness.com/post/* */
export function isValidPostUrl(url: string): boolean {
  return POST_URL_PATTERN.test(url);
}
