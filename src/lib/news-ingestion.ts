import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { cacheLife, cacheTag } from "next/cache";
import type { Article } from "./data";
import type { NewsFeed } from "./news-feeds";
import { classifyRegions, classifySubjects } from "./news-classification";

const MAX_ARTICLES_PER_FEED = 12;
const MAX_SUMMARY_LENGTH = 360;
const REQUEST_TIMEOUT_MS = 8_000;
const parser = new Parser({
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "User-Agent": "SubahNewsReader/1.0 (RSS ingestion)" },
});
// An empty summary explicitly means the publisher supplied no usable excerpt.
const NO_SUMMARY = "";

export interface NormalizedFeed {
  articles: Article[];
  rejectedItems: number;
}

export interface SourceResult {
  id: string;
  name: string;
  status: "success" | "partial" | "failed";
  articleCount: number;
  rejectedItems: number;
  error?: string;
}

function decodeXmlText(input: string): string {
  return input
    .replace(/&(#\d+|#x[\da-f]+|[a-z][\w]+);/gi, (entity) => {
      const numeric = entity.match(/^&#(\d+);$/);
      if (numeric) return decodeCodePoint(Number(numeric[1]));
      const hexadecimal = entity.match(/^&#x([\da-f]+);$/i);
      if (hexadecimal) return decodeCodePoint(Number.parseInt(hexadecimal[1], 16));

      const named: Record<string, string> = {
        amp: "&", apos: "'", nbsp: " ", lt: "<", gt: ">", quot: '"',
        lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…",
        ndash: "–", mdash: "—", copy: "©", reg: "®", trade: "™", euro: "€",
      };
      return named[entity.slice(1, -1).toLowerCase()] ?? entity;
    });
}

function normalizeTruncationMarker(text: string): string {
  return text
    .replace(/\s*(?:\[\s*(?:\.\.\.|…|truncated|continued)\s*\])\s*$/i, "…")
    .replace(/(?:\.{3,}|…{2,})$/, "…");
}

function isUrlOnlySummary(text: string): boolean {
  const candidate = text
    .trim()
    .replace(/(?:\[\s*(?:\.\.\.|…|truncated|continued)\s*\]|\.{3,}|…+)$/i, "")
    .trim()
    .replace(/[).,!;]+$/, "");
  return /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\:\d+)?(?:\/[^\s]*)?(?:\?[^\s]*)?(?:#[^\s]*)?$/i.test(candidate);
}

function plainTextExcerpt(input: string | undefined): string {
  if (!input) return "";

  const text = decodeXmlText(
    input
      .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, " ")
      .replace(/<\/?[a-z][^>]*>/gi, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

  const normalized = normalizeTruncationMarker(text);

  if (isUrlOnlySummary(normalized)) return NO_SUMMARY;
  if (normalized.length <= MAX_SUMMARY_LENGTH) return normalized;
  const excerpt = normalized.slice(0, MAX_SUMMARY_LENGTH - 1);
  const lastSpace = excerpt.lastIndexOf(" ");
  return `${excerpt.slice(0, lastSpace > 200 ? lastSpace : undefined).trimEnd()}…`;
}

function decodeCodePoint(value: number): string {
  return value >= 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)
    ? String.fromCodePoint(value)
    : " ";
}

function validArticleUrl(rawUrl: string | undefined, feed: NewsFeed): string | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    const allowed = feed.allowedArticleHosts.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
    if (!allowed) return null;

    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|at_[a-z0-9_]+$|ocid$|cmpid$)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}

function stableArticleId(canonicalUrl: string): string {
  const digest = createHash("sha256").update(canonicalUrl).digest("hex").slice(0, 24);
  return `rss-${digest}`;
}

function publicationDate(rawDate: string | undefined): string | null {
  if (!rawDate) return null;
  const timestamp = Date.parse(rawDate);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function publisherSummary(item: Parser.Item): string {
  for (const candidate of [item.summary, item.contentSnippet]) {
    const excerpt = plainTextExcerpt(candidate);
    if (excerpt) return excerpt;
  }
  return NO_SUMMARY;
}

function toArticle(
  item: Parser.Item,
  feed: NewsFeed,
): Article | null {
  const title = item.title?.replace(/\s+/g, " ").trim();
  const canonicalUrl = validArticleUrl(item.link, feed);
  const publishedAt = publicationDate(item.isoDate ?? item.pubDate);
  if (!title || !canonicalUrl || !publishedAt) return null;

  const summary = publisherSummary(item);
  const wordCount = `${title} ${summary}`.trim().split(/\s+/).filter(Boolean).length;
  // A zero value means there was not enough publisher text to estimate reading time.
  const readingMinutes = summary ? Math.max(1, Math.ceil(wordCount / 200)) : 0;

  return {
    id: stableArticleId(canonicalUrl),
    title,
    summary,
    sourceName: feed.name,
    sourceUrl: canonicalUrl,
    publishedAt,
    topics: classifySubjects(`${title} ${summary}`, feed.defaultSubjects),
    regions: classifyRegions(`${title} ${summary}`, feed.defaultRegions),
    readingMinutes,
  };
}

export function normalizeFeedItems(
  items: Parser.Item[],
  feed: NewsFeed,
): NormalizedFeed {
  let rejectedItems = 0;
  const articles: Article[] = [];
  for (const item of items.slice(0, MAX_ARTICLES_PER_FEED)) {
    const article = toArticle(item, feed);
    if (!article) {
      rejectedItems += 1;
      continue;
    }
    articles.push(article);
  }
  return { articles, rejectedItems };
}

async function loadFeed(feed: NewsFeed): Promise<NormalizedFeed> {
  "use cache";
  cacheTag("news-rss-feeds");
  cacheLife({ stale: 60, revalidate: 300, expire: 3_600 });

  let feedUrl: URL;
  try {
    feedUrl = new URL(feed.url);
  } catch {
    throw new Error("Invalid feed URL.");
  }
  const supportedHost = feed.allowedFeedHosts.some(
    (domain) => feedUrl.hostname === domain || feedUrl.hostname.endsWith(`.${domain}`),
  );
  if (feedUrl.protocol !== "https:" || !supportedHost || feedUrl.username || feedUrl.password) {
    throw new Error("Unsupported feed URL.");
  }

  const response = await fetch(feedUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9",
      "User-Agent": "SubahNewsReader/1.0 (RSS ingestion)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}.`);

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    contentType &&
    !contentType.includes("xml") &&
    !contentType.includes("rss") &&
    !contentType.includes("text/plain")
  ) {
    throw new Error(`Unsupported feed content type: ${contentType.split(";")[0]}.`);
  }

  const xml = await response.text();
  if (!/<rss(?:\s|>)/i.test(xml)) {
    throw new Error("Unsupported or malformed feed format; expected RSS 2.0.");
  }

  let parsed: Parser.Output<Parser.Item>;
  try {
    parsed = await parser.parseString(xml);
  } catch {
    throw new Error("Feed XML could not be parsed.");
  }
  if (!Array.isArray(parsed.items)) {
    throw new Error("Feed did not contain a valid RSS item list.");
  }

  return normalizeFeedItems(parsed.items, feed);
}

export async function ingestFeed(feed: NewsFeed): Promise<{
  articles: Article[];
  source: SourceResult;
}> {
  try {
    const result = await loadFeed(feed);
    return {
      articles: result.articles,
      source: {
        id: feed.id,
        name: feed.name,
        status: result.rejectedItems > 0 ? "partial" : "success",
        articleCount: result.articles.length,
        rejectedItems: result.rejectedItems,
      },
    };
  } catch (error) {
    return {
      articles: [],
      source: {
        id: feed.id,
        name: feed.name,
        status: "failed",
        articleCount: 0,
        rejectedItems: 0,
        error: error instanceof Error ? error.message : "Unknown feed error.",
      },
    };
  }
}

export async function collectNews(
  feeds: NewsFeed[],
  ingest: (feed: NewsFeed) => Promise<{ articles: Article[]; source: SourceResult }> = ingestFeed,
): Promise<{ articles: Article[]; sources: SourceResult[] }> {
  const results = await Promise.all(
    feeds.map(async (feed) => {
      try {
        return await ingest(feed);
      } catch (error) {
        return {
          articles: [],
          source: {
            id: feed.id,
            name: feed.name,
            status: "failed" as const,
            articleCount: 0,
            rejectedItems: 0,
            error: error instanceof Error ? error.message : "Unknown feed error.",
          },
        };
      }
    }),
  );

  return {
    articles: deduplicateArticles(results.flatMap((result) => result.articles)),
    sources: results.map((result) => result.source),
  };
}

export function deduplicateArticles(articles: Article[]): Article[] {
  const unique = new Map<string, Article>();
  for (const article of articles) {
    const canonicalUrl = validArticleUrl(article.sourceUrl, {
      id: "dedupe",
      name: article.sourceName,
      url: "",
      allowedFeedHosts: [],
      allowedArticleHosts: ["dawn.com", "bbc.co.uk", "bbc.com"],
      defaultSubjects: [],
      defaultRegions: [],
    });
    if (canonicalUrl && !unique.has(canonicalUrl)) unique.set(canonicalUrl, article);
  }
  return [...unique.values()].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}
