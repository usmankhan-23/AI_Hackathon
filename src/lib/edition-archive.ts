import type { Article, TopicKey } from "@/lib/data";

const STORAGE_KEY = "subah:editions:v1";
const MAX_SAVED_EDITIONS = 60;

export interface ArchivedEdition {
  id: string;
  editionDate: string;
  createdAt: string;
  topics: TopicKey[];
  articles: Article[];
  leadArticleId: string | null;
}

export function deduplicateEditionArticles(articles: Article[]): Article[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  return articles.filter((article) => {
    const url = article.sourceUrl.split(/[?#]/, 1)[0].replace(/\/$/, "").toLowerCase();
    if (seenIds.has(article.id) || seenUrls.has(url)) return false;
    seenIds.add(article.id);
    seenUrls.add(url);
    return true;
  });
}

function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.title === "string" &&
    typeof item.summary === "string" && typeof item.sourceName === "string" &&
    typeof item.sourceUrl === "string" && /^https?:\/\//i.test(item.sourceUrl) &&
    typeof item.publishedAt === "string" && Number.isFinite(Date.parse(item.publishedAt)) &&
    Array.isArray(item.topics) && item.topics.every((topic) => typeof topic === "string") &&
    typeof item.readingMinutes === "number";
}

function isArchivedEdition(value: unknown): value is ArchivedEdition {
  if (!value || typeof value !== "object") return false;
  const edition = value as Record<string, unknown>;
  return typeof edition.id === "string" && typeof edition.editionDate === "string" &&
    typeof edition.createdAt === "string" && Number.isFinite(Date.parse(edition.createdAt)) &&
    Array.isArray(edition.topics) && edition.topics.every((topic) => typeof topic === "string") &&
    Array.isArray(edition.articles) && edition.articles.every(isArticle) &&
    (typeof edition.leadArticleId === "string" || edition.leadArticleId === null);
}

export function readArchivedEditions(): ArchivedEdition[] {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) return [];
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isArchivedEdition).sort((a, b) => b.editionDate.localeCompare(a.editionDate));
  } catch {
    return [];
  }
}

export function saveEditionSnapshot(
  edition: ArchivedEdition,
): { editions: ArchivedEdition[]; error: string | null } {
  try {
    const existingEditions = readArchivedEditions();
    const existing = existingEditions.find((item) => item.id === edition.id);
    const updatedEdition = { ...edition, createdAt: existing?.createdAt ?? edition.createdAt };
    const editions = [updatedEdition, ...existingEditions.filter((item) => item.id !== edition.id)]
      .sort((a, b) => b.editionDate.localeCompare(a.editionDate))
      .slice(0, MAX_SAVED_EDITIONS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(editions));
    return { editions, error: null };
  } catch {
    return { editions: readArchivedEditions(), error: "This browser could not save the edition archive." };
  }
}

export function editionDateInKarachi(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export interface EditionSection {
  id: string;
  heading: string;
  label: { en: string; ur: string };
  articles: Article[];
}

const SECTION_GROUPS = [
  { id: "tech-ai", heading: "Technology & AI", label: { en: "Technology & AI", ur: "ٹیکنالوجی اور مصنوعی ذہانت" }, topics: ["Technology", "Artificial Intelligence"] },
  { id: "pak-world", heading: "Pakistan & World", label: { en: "Pakistan & World", ur: "پاکستان اور دنیا" }, topics: ["Pakistan", "World"] },
  { id: "sci-biz", heading: "Science & Business", label: { en: "Science & Business", ur: "سائنس اور کاروبار" }, topics: ["Science", "Business"] },
];

export function groupEditionArticles(articles: Article[], leadArticleId: string | null = null): EditionSection[] {
  const assigned = new Set(leadArticleId ? [leadArticleId] : []);
  const sections = SECTION_GROUPS.map((section) => {
    const sectionArticles = articles.filter((article) =>
      !assigned.has(article.id) && article.topics.some((topic) => section.topics.includes(topic)),
    );
    sectionArticles.forEach((article) => assigned.add(article.id));
    return { ...section, articles: sectionArticles };
  }).filter((section) => section.articles.length > 0);
  const others = articles.filter((article) => !assigned.has(article.id));
  if (others.length) sections.push({
    id: "other-news", heading: "More News", label: { en: "More News", ur: "مزید خبریں" }, topics: [], articles: others,
  });
  return sections;
}
