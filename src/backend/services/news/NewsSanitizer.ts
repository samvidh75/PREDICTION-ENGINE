export interface SanitizedNewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string | null;
  summary: string | null;
}

export function sanitizeNewsItems(raw: string): SanitizedNewsItem[] {
  if (!raw || typeof raw !== "string") return [];

  const decoded = decodeHtmlEntities(raw);
  const stripped = stripHtmlTags(decoded);
  const items = parseNewsItems(stripped);
  const deduped = deduplicateItems(items);
  return deduped.slice(0, 20);
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#\d+;/g, (m) => String.fromCharCode(Number(m.slice(2, -1))))
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, "\"")
    .replace(/&rdquo;/g, "\"");
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

function parseNewsItems(text: string): SanitizedNewsItem[] {
  const items: SanitizedNewsItem[] = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  let currentTitle = "";
  let currentUrl = "";
  let currentSource = "";
  let currentDate = "";
  let currentSummary = "";

  for (const line of lines) {
    const urlMatch = line.match(/^(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      if (currentTitle && currentUrl) {
        items.push({
          title: currentTitle,
          source: currentSource || "News",
          url: currentUrl,
          publishedAt: currentDate || null,
          summary: currentSummary || null,
        });
      }
      currentUrl = urlMatch[1];
      currentTitle = "";
      currentSource = "";
      currentDate = "";
      currentSummary = "";
      continue;
    }

    if (!currentUrl) {
      if (!currentTitle) {
        currentTitle = line;
      }
      continue;
    }

    if (!currentSource && line.length < 50 && !line.includes(" ")) {
      currentSource = line;
      continue;
    }

    if (!currentDate && /^\d{4}[-/]\d{2}[-/]\d{2}/.test(line)) {
      currentDate = line;
      continue;
    }

    if (!currentSummary) {
      currentSummary = line;
    }
  }

  if (currentTitle && currentUrl) {
    items.push({
      title: currentTitle,
      source: currentSource || "News",
      url: currentUrl,
      publishedAt: currentDate || null,
      summary: currentSummary || null,
    });
  }

  return items;
}

function deduplicateItems(items: SanitizedNewsItem[]): SanitizedNewsItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.title.toLowerCase().trim() + "|" + item.source.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sanitizeTitle(title: string): string {
  return stripHtmlTags(decodeHtmlEntities(title)).trim();
}

export function sanitizeSummary(summary: string): string {
  return stripHtmlTags(decodeHtmlEntities(summary)).trim();
}
