import { REGIONS, SUBJECTS, type Article, type RegionKey, type SubjectKey } from "./data";

export const READING_PROFILE_KEY = "subah:reading-profile:v1";

export interface ReadingProfile {
  regions: RegionKey[];
  subjects: SubjectKey[];
}

export const EMPTY_READING_PROFILE: ReadingProfile = { regions: [], subjects: [] };

export function normalizeReadingProfile(value: unknown): ReadingProfile {
  if (!value || typeof value !== "object") return { ...EMPTY_READING_PROFILE };
  const input = value as Record<string, unknown>;
  return {
    regions: Array.isArray(input.regions)
      ? [...new Set(input.regions.filter((item): item is RegionKey => typeof item === "string" && REGIONS.includes(item as RegionKey)))]
      : [],
    subjects: Array.isArray(input.subjects)
      ? [...new Set(input.subjects.filter((item): item is SubjectKey => typeof item === "string" && SUBJECTS.includes(item as SubjectKey)))]
      : [],
  };
}

export function readReadingProfile(): ReadingProfile {
  try {
    const serialized = window.localStorage.getItem(READING_PROFILE_KEY);
    return serialized ? normalizeReadingProfile(JSON.parse(serialized) as unknown) : { ...EMPTY_READING_PROFILE };
  } catch {
    return { ...EMPTY_READING_PROFILE };
  }
}

export function saveReadingProfile(profile: ReadingProfile): boolean {
  try {
    window.localStorage.setItem(READING_PROFILE_KEY, JSON.stringify(normalizeReadingProfile(profile)));
    return true;
  } catch {
    return false;
  }
}

export function clearReadingProfile(): boolean {
  try {
    window.localStorage.removeItem(READING_PROFILE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getProfileMatches(article: Article, profile: ReadingProfile) {
  return {
    subjects: article.topics.filter((topic) => profile.subjects.includes(topic)),
    regions: article.regions.filter((region) => profile.regions.includes(region)),
  };
}

function relevanceScore(article: Article, profile: ReadingProfile): number {
  const matches = getProfileMatches(article, profile);
  return matches.subjects.length * 2 + matches.regions.length * 3;
}

export function rankArticlesForProfile(articles: Article[], profile: ReadingProfile): Article[] {
  if (profile.subjects.length === 0 && profile.regions.length === 0) return articles;
  return articles.map((article, index) => ({ article, index, score: relevanceScore(article, profile) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ article }) => article);
}
