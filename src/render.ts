function getElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} element`);
  return el;
}

export function renderResult(status: number, imageUrls: string[]): void {
  document.title = `${status} OK`;
  getElement('output').textContent = JSON.stringify(imageUrls, null, 2);
}

export function renderError(status: number, message: string): void {
  document.title = `${status} Error`;
  getElement('output').textContent = JSON.stringify({ error: message }, null, 2);
}

export function renderTelegramStatus(message: string): void {
  getElement('telegram-status').textContent = message;
}
