// Subah — Sample Data Module (Stage 1)
// All data here is illustrative sample content for UI demonstration.

export interface Article {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  /** Clearly labeled placeholder URL for demo purposes */
  sourceUrl: string;
  publishedAt: string; // ISO 8601
  /** Subject matter tags only; geography is represented separately. */
  topics: SubjectKey[];
  regions: RegionKey[];
  readingMinutes: number;
  isLead?: boolean;
  imageAlt?: string;
}

export type SubjectKey =
  | "Artificial Intelligence"
  | "Technology"
  | "Politics & Government"
  | "Business & Economy"
  | "Sports"
  | "Science"
  | "Health & Medicine"
  | "Climate & Environment"
  | "Education"
  | "Culture & Entertainment";

/** Backwards-compatible name for components that previously used TopicKey. */
export type TopicKey = SubjectKey;

export type RegionKey =
  | "Pakistan"
  | "South Asia"
  | "East Asia"
  | "Southeast Asia"
  | "Middle East & North Africa"
  | "Europe"
  | "Africa"
  | "North America"
  | "Latin America"
  | "Oceania"
  | "Global";

export const SUBJECTS: SubjectKey[] = [
  "Artificial Intelligence",
  "Technology",
  "Politics & Government",
  "Business & Economy",
  "Sports",
  "Science",
  "Health & Medicine",
  "Climate & Environment",
  "Education",
  "Culture & Entertainment",
];

export const REGIONS: RegionKey[] = [
  "Pakistan", "South Asia", "East Asia", "Southeast Asia",
  "Middle East & North Africa", "Europe", "Africa", "North America",
  "Latin America", "Oceania", "Global",
];

/** Kept as a source-compatible alias for any remaining presentation imports. */
export const ALL_TOPICS = SUBJECTS;

// ─── Lead Story ────────────────────────────────────────────────────────────────

export const LEAD_STORY: Article = {
  id: "lead-001",
  title:
    "Foundation Models Enter the Research Lab: How AI Is Reshaping Scientific Discovery",
  summary:
    "A wave of foundation models trained on scientific literature is accelerating hypothesis generation across biology, chemistry, and materials science — compressing years of bench work into days of compute.",
  sourceName: "Sample Science Digest",
  sourceUrl: "#demo-lead-source",
  publishedAt: "2026-10-17T07:30:00+05:00",
  topics: ["Artificial Intelligence", "Science"],
  regions: ["Global"],
  readingMinutes: 6,
  isLead: true,
  imageAlt: "Abstract visualization of neural network overlaid on a laboratory",
};

export const LEAD_STORY_MATCH_REASON =
  "Matched your interests in Artificial Intelligence and Science.";

// ─── Technology & AI ──────────────────────────────────────────────────────────

export const TECH_AI_ARTICLES: Article[] = [
  {
    id: "tech-001",
    title: "Open-Source LLMs Surpass 100 B Parameters Without Quality Trade-Offs",
    summary:
      "A consortium of universities releases a 120 B parameter model under a permissive licence, claiming state-of-the-art scores on eight standard benchmarks.",
    sourceName: "Sample Tech Report",
    sourceUrl: "#demo-tech-001",
    publishedAt: "2026-10-17T06:00:00+05:00",
    topics: ["Artificial Intelligence", "Technology"],
    regions: ["Global"],
    readingMinutes: 4,
  },
  {
    id: "tech-002",
    title: "Browser-Native AI: Running Inference Directly in Chrome",
    summary:
      "Google's experimental WebGPU inference runtime lets developers embed small language models in web pages without a server call, raising privacy and performance questions.",
    sourceName: "Sample Dev Weekly",
    sourceUrl: "#demo-tech-002",
    publishedAt: "2026-10-17T05:15:00+05:00",
    topics: ["Technology", "Artificial Intelligence"],
    regions: ["Global"],
    readingMinutes: 3,
  },
  {
    id: "tech-003",
    title: "Chip Makers Race to Build Dedicated AI Memory Architectures",
    summary:
      "New memory-near-compute designs promise to cut the energy cost of token generation by half, a crucial metric as inference deployments scale.",
    sourceName: "Sample Silicon Review",
    sourceUrl: "#demo-tech-003",
    publishedAt: "2026-10-16T22:00:00+05:00",
    topics: ["Technology", "Business & Economy"],
    regions: ["Global"],
    readingMinutes: 5,
  },
  {
    id: "tech-004",
    title: "Code Assistants Overtake Stack Overflow as the Primary Developer Reference",
    summary:
      "A global developer survey of 45,000 respondents finds AI coding tools are now the first stop for 62 % of professional developers when encountering an unfamiliar API.",
    sourceName: "Sample Developer Insight",
    sourceUrl: "#demo-tech-004",
    publishedAt: "2026-10-16T18:30:00+05:00",
    topics: ["Technology", "Artificial Intelligence"],
    regions: ["Global"],
    readingMinutes: 4,
  },
];

// ─── Pakistan & World ─────────────────────────────────────────────────────────

export const PAKISTAN_WORLD_ARTICLES: Article[] = [
  {
    id: "pak-001",
    title: "Karachi Fintech Summit Draws Record 12,000 Attendees",
    summary:
      "Pakistan's largest financial technology conference showcases over 200 startups, with venture pledges reportedly exceeding $400 million across three sessions.",
    sourceName: "Sample Business Daily (PK)",
    sourceUrl: "#demo-pak-001",
    publishedAt: "2026-10-17T08:00:00+05:00",
    topics: ["Business & Economy", "Technology"],
    regions: ["Pakistan"],
    readingMinutes: 3,
  },
  {
    id: "pak-002",
    title: "UN Climate Report Flags South Asia Heatwave Risk Through 2035",
    summary:
      "A UNEP working paper projects wet-bulb temperatures exceeding survivability thresholds in parts of Sindh and Balochistan without coordinated mitigation by 2030.",
    sourceName: "Sample Global Environment Monitor",
    sourceUrl: "#demo-pak-002",
    publishedAt: "2026-10-17T04:45:00+05:00",
    topics: ["Climate & Environment", "Science"],
    regions: ["Pakistan", "South Asia"],
    readingMinutes: 5,
  },
  {
    id: "pak-003",
    title: "Pakistan's National Language Authority Launches Urdu NLP Corpus",
    summary:
      "A 10-billion-word public corpus covering news, literature, and social media is now freely available, aiming to accelerate local AI research.",
    sourceName: "Sample Dawn Tech",
    sourceUrl: "#demo-pak-003",
    publishedAt: "2026-10-16T20:00:00+05:00",
    topics: ["Artificial Intelligence", "Technology"],
    regions: ["Pakistan"],
    readingMinutes: 4,
  },
  {
    id: "world-001",
    title: "G20 Finance Ministers Agree on Draft Framework for AI Liability",
    summary:
      "After three rounds of talks, member nations reach a provisional consensus attributing civil liability for high-risk AI systems to deployers rather than model developers.",
    sourceName: "Sample Global Affairs",
    sourceUrl: "#demo-world-001",
    publishedAt: "2026-10-16T15:00:00+05:00",
    topics: ["Politics & Government", "Artificial Intelligence"],
    regions: ["Global"],
    readingMinutes: 5,
  },
];

// ─── Science & Business ───────────────────────────────────────────────────────

export const SCIENCE_BUSINESS_ARTICLES: Article[] = [
  {
    id: "sci-001",
    title: "Room-Temperature Superconductor Claim Survives First Independent Replication",
    summary:
      "A Korean team's material holds superconducting properties at 22 °C under ambient pressure in a replication carried out by three independent European labs.",
    sourceName: "Sample Physics Today",
    sourceUrl: "#demo-sci-001",
    publishedAt: "2026-10-17T03:30:00+05:00",
    topics: ["Science"],
    regions: ["East Asia", "Europe"],
    readingMinutes: 7,
  },
  {
    id: "sci-002",
    title: "Quantum Computing Reaches 10,000-Qubit Milestone in Commercial Device",
    summary:
      "IBM unveils a system that maintains coherence long enough for meaningful fault-tolerant computation — a threshold researchers predicted would arrive in 2028.",
    sourceName: "Sample Quantum Review",
    sourceUrl: "#demo-sci-002",
    publishedAt: "2026-10-16T22:30:00+05:00",
    topics: ["Science", "Technology"],
    regions: ["Global"],
    readingMinutes: 5,
  },
  {
    id: "biz-001",
    title: "Global EV Sales Cross 30 % Market Share for the First Time",
    summary:
      "September data from six major auto markets confirm electric vehicles now account for nearly one-in-three new car registrations — a milestone analysts had placed in 2028.",
    sourceName: "Sample Mobility Economics",
    sourceUrl: "#demo-biz-001",
    publishedAt: "2026-10-17T05:00:00+05:00",
    topics: ["Business & Economy"],
    regions: ["Global"],
    readingMinutes: 3,
  },
  {
    id: "biz-002",
    title: "SBP Cuts Policy Rate to 14 %, Signaling Economic Recovery Confidence",
    summary:
      "The State Bank of Pakistan lowers its benchmark rate by 50 basis points, citing declining headline inflation and improving current account balance.",
    sourceName: "Sample Pakistan Economic Observer",
    sourceUrl: "#demo-biz-002",
    publishedAt: "2026-10-16T17:00:00+05:00",
    topics: ["Business & Economy", "Politics & Government"],
    regions: ["Pakistan"],
    readingMinutes: 4,
  },
];

// ─── All sections ─────────────────────────────────────────────────────────────

export const SECTIONS = [
  {
    id: "tech-ai",
    label: { en: "Technology & AI", ur: "ٹیکنالوجی اور مصنوعی ذہانت" },
    articles: TECH_AI_ARTICLES,
  },
  {
    id: "pak-world",
    label: { en: "Pakistan & World", ur: "پاکستان اور دنیا" },
    articles: PAKISTAN_WORLD_ARTICLES,
  },
  {
    id: "sci-biz",
    label: { en: "Science & Business", ur: "سائنس اور کاروبار" },
    articles: SCIENCE_BUSINESS_ARTICLES,
  },
] as const;

// ─── Ask Subah demo Q&A ────────────────────────────────────────────────────────

export const DEMO_SUGGESTIONS: { en: string; ur: string }[] = [
  { en: "What are the top AI stories today?", ur: "آج کی بڑی AI خبریں کیا ہیں؟" },
  { en: "Summarize the Pakistan business news.", ur: "پاکستان کی کاروباری خبروں کا خلاصہ بتائیں۔" },
  { en: "What happened in science this week?", ur: "اس ہفتے سائنس میں کیا ہوا؟" },
];

export const DEMO_AI_RESPONSE = {
  en: "📌 This is a demo response. The Ask Subah feature will connect to a news-aware AI model in a future stage of development. Your question has been noted.",
  ur: "📌 یہ ایک ڈیمو جواب ہے۔ 'سوال کریں سُبح سے' فیچر آئندہ مرحلے میں AI سے جڑ جائے گا۔ آپ کا سوال محفوظ کر لیا گیا ہے۔",
};
