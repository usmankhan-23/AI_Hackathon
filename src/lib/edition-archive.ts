import type { Article, RegionKey, SubjectKey } from "./data";
import { normalizeArticleTaxonomy } from "./news-classification";

const STORAGE_KEY = "subah:editions:v1";
const MAX_SAVED_EDITIONS = 60;

export interface ArchivedEdition {
  id: string;
  editionDate: string;
  createdAt: string;
  subjects: SubjectKey[];
  regions: RegionKey[];
  /** Legacy mixed preferences are read only to migrate older browser editions. */
  topics?: string[];
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
    (item.regions === undefined || (Array.isArray(item.regions) && item.regions.every((region) => typeof region === "string"))) &&
    typeof item.readingMinutes === "number" && Number.isFinite(item.readingMinutes);
}

export function migrateArchivedEdition(value: unknown): ArchivedEdition | null {
  if (!value || typeof value !== "object") return null;
  const edition = value as Record<string, unknown>;
  if (!(typeof edition.id === "string" && typeof edition.editionDate === "string" &&
    typeof edition.createdAt === "string" && Number.isFinite(Date.parse(edition.createdAt)) &&
    Array.isArray(edition.articles) && edition.articles.every(isArticle) &&
    (typeof edition.leadArticleId === "string" || edition.leadArticleId === null))) return null;

  const legacyTopics = Array.isArray(edition.topics)
    ? edition.topics.filter((item): item is string => typeof item === "string")
    : [];
  const subjectNames: SubjectKey[] = ["Artificial Intelligence", "Technology", "Politics & Government", "Business & Economy", "Sports", "Science", "Health & Medicine", "Climate & Environment", "Education", "Culture & Entertainment"];
  const regionNames: RegionKey[] = ["Pakistan", "South Asia", "East Asia", "Southeast Asia", "Middle East & North Africa", "Europe", "Africa", "North America", "Latin America", "Oceania", "Global"];
  const legacySubjectAliases: Record<string, SubjectKey> = { Business: "Business & Economy", Politics: "Politics & Government", Health: "Health & Medicine", Environment: "Climate & Environment", Culture: "Culture & Entertainment" };
  const subjects = Array.isArray(edition.subjects)
    ? edition.subjects.filter((item): item is SubjectKey => typeof item === "string" && subjectNames.includes(item as SubjectKey))
    : legacyTopics.flatMap((topic) => {
      if (subjectNames.includes(topic as SubjectKey)) return [topic as SubjectKey];
      return legacySubjectAliases[topic] ? [legacySubjectAliases[topic]] : [];
    });
  const regions = Array.isArray(edition.regions)
    ? edition.regions.filter((item): item is RegionKey => typeof item === "string" && regionNames.includes(item as RegionKey))
    : legacyTopics.filter((topic) => topic === "Pakistan" || topic === "World").map((topic): RegionKey => topic === "World" ? "Global" : "Pakistan");

  return {
    id: edition.id,
    editionDate: edition.editionDate,
    createdAt: edition.createdAt,
    subjects,
    regions,
    articles: deduplicateEditionArticles((edition.articles as Article[]).map(normalizeArticleTaxonomy)),
    leadArticleId: edition.leadArticleId,
  };
}

export function readArchivedEditions(): ArchivedEdition[] {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) return [];
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateArchivedEdition).filter((item): item is ArchivedEdition => item !== null)
      .sort((a, b) => b.editionDate.localeCompare(a.editionDate));
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
  { id: "politics-economy", heading: "Politics & Economy", label: { en: "Politics & Economy", ur: "سیاست اور معیشت" }, topics: ["Politics & Government", "Business & Economy"] },
  { id: "science-environment", heading: "Science & Environment", label: { en: "Science & Environment", ur: "سائنس اور ماحول" }, topics: ["Science", "Climate & Environment"] },
  { id: "health-education", heading: "Health & Education", label: { en: "Health & Education", ur: "صحت اور تعلیم" }, topics: ["Health & Medicine", "Education"] },
  { id: "culture-sports", heading: "Culture & Sports", label: { en: "Culture & Sports", ur: "ثقافت اور کھیل" }, topics: ["Culture & Entertainment", "Sports"] },
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
