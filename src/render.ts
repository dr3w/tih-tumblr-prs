function getOutputElement(): HTMLElement {
  const el = document.getElementById('output');
  if (!el) throw new Error('Missing #output element');
  return el;
}

export function renderResult(status: number, imageUrls: string[]): void {
  document.title = `${status} OK`;
  getOutputElement().textContent = JSON.stringify(imageUrls, null, 2);
}

export function renderError(status: number, message: string): void {
  document.title = `${status} Error`;
  getOutputElement().textContent = JSON.stringify({ error: message }, null, 2);
}
