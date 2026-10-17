import type { RegionKey, SubjectKey } from "@/lib/data";

export interface NewsFeed {
  id: string;
  name: string;
  url: string;
  allowedFeedHosts: string[];
  allowedArticleHosts: string[];
  defaultSubjects: SubjectKey[];
  defaultRegions: RegionKey[];
}

export const NEWS_FEEDS: NewsFeed[] = [
  {
    id: "dawn-pakistan",
    name: "Dawn",
    url: "https://www.dawn.com/feeds/pakistan/",
    allowedFeedHosts: ["dawn.com"],
    allowedArticleHosts: ["dawn.com"],
    defaultSubjects: [],
    defaultRegions: ["Pakistan"],
  },
  {
    id: "bbc-technology",
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    allowedFeedHosts: ["bbci.co.uk"],
    allowedArticleHosts: ["bbc.co.uk", "bbc.com"],
    defaultSubjects: ["Technology"],
    defaultRegions: [],
  },
  {
    id: "bbc-world",
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    allowedFeedHosts: ["bbci.co.uk"],
    allowedArticleHosts: ["bbc.co.uk", "bbc.com"],
    defaultSubjects: [],
    defaultRegions: [],
  },
  {
    id: "bbc-sport",
    name: "BBC Sport",
    url: "https://feeds.bbci.co.uk/sport/rss.xml",
    allowedFeedHosts: ["bbci.co.uk"],
    allowedArticleHosts: ["bbc.co.uk", "bbc.com"],
    defaultSubjects: ["Sports"],
    defaultRegions: [],
  },
];
