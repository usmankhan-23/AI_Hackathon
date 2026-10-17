import type { Article, RegionKey, SubjectKey } from "./data";

const SUBJECT_RULES: Array<{ key: SubjectKey; rule: RegExp }> = [
  { key: "Artificial Intelligence", rule: /\b(?:artificial intelligence|\bAI\b|machine learning|chatgpt|openai|anthropic|large language model|\bLLM\b)\b/i },
  { key: "Technology", rule: /\b(?:technology|tech|cyber(?:security)?|software|internet|digital|smartphone|computer|app|chip|data breach|hacked|online platform)\b/i },
  { key: "Politics & Government", rule: /\b(?:election|electoral|parliament|senate|cabinet|prime minister|president|government|governor|minister|political party|opposition|legislation|bill passed|court ruling|diplomatic|sanctions|policy rate)\b/i },
  { key: "Business & Economy", rule: /\b(?:business|econom(?:y|ic)|inflation|interest rate|stock market|share prices|shares? (?:rise|rises|rose|fall|falls|fell|drop|drops|dropped|surge|surges|surged)|quarterly earnings|revenue|profit|trade deal|startup|merger|acquisition|central bank|commercial bank|banking|budget|investment|investor|oil prices|company earnings)\b/i },
  { key: "Sports", rule: /\b(?:sports?|football|soccer|cricket|tennis|rugby|basketball|baseball|golf|formula one|grand prix|olympic|world cup|test match|t20|premier league|champions league|wimbledon|fifa|icc|nba|nfl|nhl|fixture|innings|wicket|goal|tournament|coach|striker|batter|bowler|scorecard)\b/i },
  { key: "Science", rule: /\b(?:scientific study|science research|research paper|laboratory|peer.reviewed|experiment|genome|quantum|physics|chemistry|biology|astronom(?:y|er)|spacecraft|telescope|nasa|superconductor|clinical trial|fossil discovery)\b/i },
  { key: "Health & Medicine", rule: /\b(?:health|medical|medicine|hospital|patient|disease|virus|vaccine|surgery|doctor|nhs|cancer|mental health|outbreak|clinical care)\b/i },
  { key: "Climate & Environment", rule: /\b(?:climate change|global warming|carbon emissions|greenhouse gas|deforestation|biodiversity|wildlife|conservation|renewable energy|pollution|heatwave|flooding|drought|environment)\b/i },
  { key: "Education", rule: /\b(?:education|school|student|university|college|teacher|exam results|curriculum|tuition|campus|classroom|pupil)\b/i },
  { key: "Culture & Entertainment", rule: /\b(?:film|movie|television|tv series|actor|actress|celebrity|music|musician|concert|album|theatre|art exhibition|book review|fashion|festival|cultural)\b/i },
];

const REGION_RULES: Array<{ key: RegionKey; rule: RegExp }> = [
  { key: "Pakistan", rule: /\b(?:pakistan|pakistani|karachi|lahore|islamabad|peshawar|quetta|balochistan|khyber pakhtunkhwa|sindh|punjab province)\b/i },
  { key: "South Asia", rule: /\b(?:south asia|india|indian|bangladesh|bangladeshi|sri lanka|sri lankan|nepal|nepali|bhutan|maldives|afghanistan|afghan)\b/i },
  { key: "East Asia", rule: /\b(?:east asia|china|chinese|japan|japanese|north korea|south korea|korean|taiwan|taiwanese|hong kong|mongolia)\b/i },
  { key: "Southeast Asia", rule: /\b(?:southeast asia|indonesia|indonesian|malaysia|malaysian|singapore|singaporean|thailand|thai|vietnam|vietnamese|philippines|filipino|myanmar|burma|cambodia|laos|brunei|timor.leste)\b/i },
  { key: "Middle East & North Africa", rule: /\b(?:middle east|north africa|iran|iranian|iraq|iraqi|israel|israeli|palestine|palestinian|gaza|west bank|syria|syrian|lebanon|lebanese|jordan|jordanian|saudi arabia|yemen|oman|uae|united arab emirates|qatar|kuwait|bahrain|egypt|egyptian|libya|libyan|tunisia|algeria|morocco|sudan)\b/i },
  { key: "Europe", rule: /\b(?:europe|european|ukraine|ukrainian|russia|russian|united kingdom|britain|british|england|scotland|wales|ireland|irish|france|french|germany|german|italy|italian|spain|spanish|poland|polish|sweden|swedish|norway|norwegian|netherlands|dutch|brussels|european union)\b/i },
  { key: "Africa", rule: /\b(?:africa|african|nigeria|nigerian|kenya|kenyan|south africa|ethiopia|ethiopian|ghana|ghanaian|somalia|somali|congo|rwanda|senegal|uganda|tanzania|zimbabwe)\b/i },
  { key: "North America", rule: /\b(?:north america|united states|usa|american|canada|canadian|mexico|mexican|washington dc|white house|us (?:president|government|officials|military|journalist|based))\b/i },
  { key: "Latin America", rule: /\b(?:latin america|south america|brazil|brazilian|argentina|argentinian|chile|chilean|colombia|colombian|peru|peruvian|venezuela|cuba|cuban|central america|caribbean)\b/i },
  { key: "Oceania", rule: /\b(?:oceania|australia|australian|new zealand|kiwi|papua new guinea|fiji)\b/i },
  { key: "Global", rule: /\b(?:global|worldwide|world wide|internationally|across the world|around the world|global study|global report)\b/i },
];

const SUBJECT_ALIASES: Record<string, SubjectKey> = {
  Business: "Business & Economy",
  "Politics": "Politics & Government",
  "Health": "Health & Medicine",
  "Environment": "Climate & Environment",
  Culture: "Culture & Entertainment",
};

export function classifySubjects(text: string, defaults: SubjectKey[] = []): SubjectKey[] {
  const result = new Set<SubjectKey>(defaults);
  for (const { key, rule } of SUBJECT_RULES) if (rule.test(text)) result.add(key);
  return [...result];
}

export function classifyRegions(text: string, defaults: RegionKey[] = []): RegionKey[] {
  const result = new Set<RegionKey>(defaults);
  for (const { key, rule } of REGION_RULES) if (rule.test(text)) result.add(key);
  if (result.has("Pakistan")) result.add("South Asia");
  return [...result];
}

/** Migrate the former mixed topics array and classify older saved/article records. */
export function normalizeArticleTaxonomy(article: Article | Record<string, unknown>): Article {
  const value = article as Record<string, unknown>;
  const legacyTopics = Array.isArray(value.topics) ? value.topics.filter((item): item is string => typeof item === "string") : [];
  const text = `${typeof value.title === "string" ? value.title : ""} ${typeof value.summary === "string" ? value.summary : ""}`;
  const oldRegions = legacyTopics.filter((topic) => ["Pakistan", "World"].includes(topic));
  const subjects = legacyTopics.flatMap((topic) => {
    if ((SUBJECT_RULES.some(({ key }) => key === topic))) return [topic as SubjectKey];
    if (SUBJECT_ALIASES[topic]) return [SUBJECT_ALIASES[topic]];
    return [];
  });
  const existingRegions = Array.isArray(value.regions)
    ? value.regions.filter((item): item is RegionKey => typeof item === "string" && REGION_RULES.some((region) => region.key === item))
    : oldRegions.map((region): RegionKey => region === "World" ? "Global" : "Pakistan");

  return {
    ...(value as unknown as Article),
    topics: classifySubjects(text, subjects),
    regions: classifyRegions(text, existingRegions),
  };
}

export function filterArticles(
  articles: Article[],
  selectedRegions: RegionKey[],
  selectedSubjects: SubjectKey[],
): Article[] {
  return articles
    .map(normalizeArticleTaxonomy)
    .filter((article) => {
      const matchesRegion = selectedRegions.length === 0 || article.regions.some((region) => selectedRegions.includes(region));
      const matchesSubject = selectedSubjects.length === 0 || article.topics.some((subject) => selectedSubjects.includes(subject));
      return matchesRegion && matchesSubject;
    });
}
