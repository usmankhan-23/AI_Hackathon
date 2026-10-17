import type { TopicKey } from "@/lib/data";

export interface NewsFeed {
  id: string;
  name: string;
  url: string;
  allowedFeedHosts: string[];
  allowedArticleHosts: string[];
  defaultTopics: TopicKey[];
}

export const NEWS_FEEDS: NewsFeed[] = [
  {
    id: "dawn-pakistan",
    name: "Dawn",
    url: "https://www.dawn.com/feeds/pakistan/",
    allowedFeedHosts: ["dawn.com"],
    allowedArticleHosts: ["dawn.com"],
    defaultTopics: ["Pakistan"],
  },
  {
    id: "bbc-technology",
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    allowedFeedHosts: ["bbci.co.uk"],
    allowedArticleHosts: ["bbc.co.uk", "bbc.com"],
    defaultTopics: ["Technology"],
  },
  {
    id: "bbc-world",
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    allowedFeedHosts: ["bbci.co.uk"],
    allowedArticleHosts: ["bbc.co.uk", "bbc.com"],
    defaultTopics: ["World"],
  },
];
