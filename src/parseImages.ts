const MARKER_TEXT = 'MORE YOU MIGHT LIKE';
const MIN_SIZE = 200;

interface ImageSize {
  width: number;
  height: number;
}

/**
 * Extracts image URLs from `html`. Images above the "MORE YOU MIGHT LIKE"
 * marker must be strictly larger than 200x200; if no marker is found, every
 * image on the page is considered and the threshold is inclusive (>=200x200).
 */
export async function extractImageUrls(html: string, baseUrl: string): Promise<string[]> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const allImages = Array.from(doc.images);
  const marker = findMarkerNode(doc, MARKER_TEXT);

  const candidates = marker ? imagesBefore(allImages, marker) : allImages;
  const strict = marker !== null;

  const urls = new Set<string>();

  for (const img of candidates) {
    const rawSrc = getImageSrc(img);
    if (!rawSrc) continue;

    let resolvedUrl: string;
    try {
      resolvedUrl = new URL(rawSrc, baseUrl).toString();
    } catch {
      continue;
    }

    let size: ImageSize;
    try {
      size = await resolveImageSize(img, resolvedUrl);
    } catch {
      continue;
    }

    const passes = strict
      ? size.width > MIN_SIZE && size.height > MIN_SIZE
      : size.width >= MIN_SIZE && size.height >= MIN_SIZE;

    if (passes) urls.add(resolvedUrl);
  }

  return Array.from(urls);
}

/** Finds the first text node whose trimmed content matches `text`. */
function findMarkerNode(doc: Document, text: string): Node | null {
  if (!doc.body) return null;

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if ((node.textContent ?? '').trim().toUpperCase() === text.toUpperCase()) {
      return node;
    }
    node = walker.nextNode();
  }

  return null;
}

function imagesBefore(images: HTMLImageElement[], marker: Node): HTMLImageElement[] {
  return images.filter((img) => {
    const position = marker.compareDocumentPosition(img);
    return Boolean(position & Node.DOCUMENT_POSITION_PRECEDING);
  });
}

/** Prefers a lazy-load source, then the largest srcset candidate, then src. */
function getImageSrc(img: HTMLImageElement): string | null {
  const dataSrc = img.getAttribute('data-src');
  if (dataSrc) return dataSrc;

  const srcset = img.getAttribute('srcset');
  if (srcset) {
    const candidates = srcset
      .split(',')
      .map((entry) => entry.trim().split(/\s+/)[0])
      .filter((candidate): candidate is string => Boolean(candidate));
    if (candidates.length > 0) return candidates[candidates.length - 1];
  }

  return img.getAttribute('src');
}

/** Reads a declared size off the tag (Tumblr's data-orig-* or width/height). */
function getDeclaredSize(img: HTMLImageElement): ImageSize | null {
  const origWidth = Number(img.getAttribute('data-orig-width'));
  const origHeight = Number(img.getAttribute('data-orig-height'));
  if (origWidth > 0 && origHeight > 0) {
    return { width: origWidth, height: origHeight };
  }

  const width = Number(img.getAttribute('width'));
  const height = Number(img.getAttribute('height'));
  if (width > 0 && height > 0) {
    return { width, height };
  }

  return null;
}

/** Loads `url` in a detached Image to read its natural dimensions. */
function loadImageSize(url: string): Promise<ImageSize> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

async function resolveImageSize(img: HTMLImageElement, resolvedUrl: string): Promise<ImageSize> {
  return getDeclaredSize(img) ?? (await loadImageSize(resolvedUrl));
}
