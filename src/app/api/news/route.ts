import { NEWS_FEEDS } from "@/lib/news-feeds";
import { collectNews } from "@/lib/news-ingestion";

/**
 * Returns { updatedAt, articles, sources }, where each source has id, name,
 * status, articleCount, rejectedItems, and an optional error. An empty summary
 * means no usable publisher excerpt was provided; readingMinutes is 0 when no
 * estimate can be made from source text.
 */
export async function GET() {
  const { articles, sources } = await collectNews(NEWS_FEEDS);
  const updatedAt = new Date().toISOString();
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };

  if (sources.every((source) => source.status === "failed")) {
    return Response.json(
      {
        updatedAt,
        articles: [],
        sources,
        error: "All configured news sources failed. Try again later.",
      },
      { status: 502, headers },
    );
  }

  return Response.json(
    { updatedAt, articles, sources },
    { headers },
  );
}
