import test from "node:test";
import assert from "node:assert/strict";
import { classifyRegions, classifySubjects, filterArticles } from "../src/lib/news-classification.ts";
import { deduplicateEditionArticles, groupEditionArticles, migrateArchivedEdition } from "../src/lib/edition-archive.ts";
import { collectNews, normalizeFeedItems } from "../src/lib/news-ingestion.ts";
import { NEWS_FEEDS } from "../src/lib/news-feeds.ts";
import { createEditionPdfDocument } from "../src/lib/edition-pdf.ts";
import { clearReadingProfile, getProfileMatches, rankArticlesForProfile, readReadingProfile, READING_PROFILE_KEY, saveReadingProfile } from "../src/lib/reading-intelligence.ts";

const makeArticle = (id, title, topics = [], regions = [], publishedAt = "2026-10-17T10:00:00.000Z") => ({
  id, title, summary: "A publisher-provided report.", sourceName: "Test Publisher",
  sourceUrl: `https://example.com/${id}`, publishedAt, topics, regions, readingMinutes: 1,
});

const corpus = [
  makeArticle("pk-sport", "Pakistan cricket team reaches final", ["Sports"], ["Pakistan"]),
  makeArticle("eu-sport", "European football club wins tournament", ["Sports"], ["Europe"]),
  makeArticle("pk-business", "Pakistan central bank cuts interest rate", ["Business & Economy"], ["Pakistan"]),
  makeArticle("us-health", "US hospital expands cancer care", ["Health & Medicine"], ["North America"]),
  makeArticle("east-school", "Japan university opens new campus", ["Education"], ["East Asia"]),
];

test("Pakistan plus Sports uses AND across groups", () => {
  assert.deepEqual(filterArticles(corpus, ["Pakistan"], ["Sports"]).map((item) => item.id), ["pk-sport"]);
});

test("single-group selections leave the other group unrestricted", () => {
  assert.deepEqual(filterArticles(corpus, [], ["Sports"]).map((item) => item.id), ["pk-sport", "eu-sport"]);
  assert.deepEqual(filterArticles(corpus, ["Pakistan"], []).map((item) => item.id), ["pk-sport", "pk-business"]);
});

test("multiple subjects and regions use OR within their groups", () => {
  assert.deepEqual(filterArticles(corpus, [], ["Sports", "Education"]).map((item) => item.id), ["pk-sport", "eu-sport", "east-school"]);
  assert.deepEqual(filterArticles(corpus, ["Pakistan", "Europe"], []).map((item) => item.id), ["pk-sport", "eu-sport", "pk-business"]);
});

test("empty groups show all and unmatched groups show nothing", () => {
  assert.equal(filterArticles(corpus, [], []).length, corpus.length);
  assert.deepEqual(filterArticles(corpus, ["Africa"], ["Sports"]), []);
});

test("edition collection deduplicates IDs and canonical story URLs", () => {
  const first = makeArticle("same-id", "First copy", ["Sports"], ["Pakistan"]);
  const repeatedId = { ...first, title: "Repeated ID", sourceUrl: "https://example.com/other" };
  const repeatedUrl = { ...first, id: "other-id", sourceUrl: "https://example.com/same-id?utm_source=feed" };
  assert.deepEqual(deduplicateEditionArticles([first, repeatedId, repeatedUrl]).map((item) => item.id), ["same-id"]);
});

test("the lead and section grouping both use the filtered collection", () => {
  const filtered = filterArticles(corpus, ["Pakistan"], ["Sports"]);
  const lead = [...filtered].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0];
  assert.equal(lead.id, "pk-sport");
  assert.deepEqual(groupEditionArticles(filtered, lead.id), []);
});

test("empty profile retains original order, relevance improves ranking, and ties stay stable", () => {
  const items = [
    makeArticle("general", "General story", [], []),
    makeArticle("sports", "Sports story", ["Sports"], []),
    makeArticle("pk-sports", "Pakistan sports story", ["Sports"], ["Pakistan"]),
    makeArticle("other-sports", "Another sports story", ["Sports"], []),
  ];
  assert.deepEqual(rankArticlesForProfile(items, { regions: [], subjects: [] }).map((item) => item.id), items.map((item) => item.id));
  assert.deepEqual(rankArticlesForProfile(items, { regions: ["Pakistan"], subjects: ["Sports"] }).map((item) => item.id), ["pk-sports", "sports", "other-sports", "general"]);
});

test("why-this-story matches only actual preferred article metadata", () => {
  const article = makeArticle("only-sport", "Sports story", ["Sports"], ["Pakistan"]);
  assert.deepEqual(getProfileMatches(article, { subjects: ["Sports"], regions: ["Europe"] }), { subjects: ["Sports"], regions: [] });
  assert.deepEqual(getProfileMatches(article, { subjects: ["Science"], regions: ["Europe"] }), { subjects: [], regions: [] });
});

test("reading profile persists, restores valid preferences, and resets safely", () => {
  const values = new Map();
  globalThis.window = { localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  } };
  try {
    assert.equal(saveReadingProfile({ regions: ["Pakistan"], subjects: ["Sports"] }), true);
    assert.deepEqual(readReadingProfile(), { regions: ["Pakistan"], subjects: ["Sports"] });
    assert.ok(values.has(READING_PROFILE_KEY));
    values.set(READING_PROFILE_KEY, JSON.stringify({ regions: ["Mars"], subjects: ["Sports", "Invalid"] }));
    assert.deepEqual(readReadingProfile(), { regions: [], subjects: ["Sports"] });
    assert.equal(clearReadingProfile(), true);
    assert.deepEqual(readReadingProfile(), { regions: [], subjects: [] });
  } finally {
    delete globalThis.window;
  }
});

test("classification uses targeted subject and geographic evidence", () => {
  assert.deepEqual(classifySubjects("Actress discusses hospital care after a medical emergency"), ["Health & Medicine", "Culture & Entertainment"]);
  assert.deepEqual(classifySubjects("Pakistan cricket team wins the final"), ["Sports"]);
  assert.deepEqual(classifySubjects("US journalist injured by Israeli settlers in the West Bank"), []);
  assert.deepEqual(classifySubjects("Pakistan central bank cuts the interest rate"), ["Business & Economy"]);
  assert.deepEqual(classifyRegions("Japan and South Korea announce a research partnership"), ["East Asia"]);
});

test("legacy archive mixed topics and article tags migrate without deleting the record", () => {
  const legacy = {
    id: "subah-2026-10-17", editionDate: "2026-10-17", createdAt: "2026-10-17T12:00:00Z",
    topics: ["Artificial Intelligence", "Pakistan"],
    articles: [{ ...makeArticle("old", "Pakistan AI project", ["Artificial Intelligence", "Pakistan"]), regions: undefined }],
    leadArticleId: "old",
  };
  const migrated = migrateArchivedEdition(legacy);
  assert.ok(migrated);
  assert.deepEqual(migrated.subjects, ["Artificial Intelligence"]);
  assert.deepEqual(migrated.regions, ["Pakistan"]);
  assert.deepEqual(migrated.articles[0].topics, ["Artificial Intelligence"]);
  assert.deepEqual(migrated.articles[0].regions, ["Pakistan", "South Asia"]);
});

test("BBC sports feed is configured and invalid feed items are rejected", () => {
  const sports = NEWS_FEEDS.find((feed) => feed.id === "bbc-sport");
  assert.ok(sports);
  assert.equal(sports.url, "https://feeds.bbci.co.uk/sport/rss.xml");
  const result = normalizeFeedItems([
    { title: "Missing date", link: "https://www.bbc.co.uk/sport/example/1" },
    { title: "Cricket final", link: "https://www.bbc.co.uk/sport/cricket/example/2", isoDate: "2026-10-17T10:00:00Z", contentSnippet: "The final match report." },
  ], sports);
  assert.equal(result.articles.length, 1);
  assert.equal(result.rejectedItems, 1);
});

test("one failed feed does not discard another source result", async () => {
  const feeds = NEWS_FEEDS.filter((feed) => feed.id === "dawn-pakistan" || feed.id === "bbc-sport");
  const result = await collectNews(feeds, async (feed) => {
    if (feed.id === "bbc-sport") throw new Error("simulated unavailable sports feed");
    return { articles: [{ ...makeArticle("live", "Pakistan cricket update", ["Sports"], ["Pakistan"]), sourceUrl: "https://www.dawn.com/news/123" }], source: {
      id: feed.id, name: feed.name, status: "success", articleCount: 1, rejectedItems: 0,
    } };
  });
  assert.equal(result.articles.length, 1);
  assert.equal(result.sources.find((source) => source.id === "bbc-sport").status, "failed");
  assert.equal(result.sources.find((source) => source.id === "dawn-pakistan").status, "success");
});

test("filtered edition snapshot drives the PDF pages and clickable source links", async () => {
  const candidates = Array.from({ length: 28 }, (_, index) => makeArticle(
    `pk-sport-${index}`,
    `Pakistan cricket report ${index}`,
    ["Sports"],
    ["Pakistan"],
  )).map((article) => ({
    ...article,
    summary: `Publisher summary for report ${article.id}. ${"Pakistan cricket coverage and match details. ".repeat(7)}`,
  }));
  candidates.push(makeArticle("excluded", "European science report", ["Science"], ["Europe"]));
  const filtered = filterArticles(candidates, ["Pakistan"], ["Sports"]);
  const savedSnapshot = { editionDate: "2026-10-17", regions: ["Pakistan"], subjects: ["Sports"], articles: filtered, leadArticleId: filtered[0].id };
  const pdf = await createEditionPdfDocument(savedSnapshot);
  const output = pdf.output();
  assert.ok(pdf.getNumberOfPages() > 1);
  assert.match(output, /Pakistan cricket report 0/);
  assert.doesNotMatch(output, /European science report/);
  assert.match(output, /\/URI/);
  assert.match(output, /https:\/\/example\.com\/pk-sport-0/);
});
