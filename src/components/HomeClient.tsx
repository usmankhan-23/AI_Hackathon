"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Masthead from "@/components/Masthead";
import TopicSelector, { REGION_UR, SUBJECT_UR } from "@/components/TopicSelector";
import LeadStory from "@/components/LeadStory";
import ArticleCard from "@/components/ArticleCard";
import AskSubah from "@/components/AskSubah";
import EditionActions from "@/components/EditionActions";
import EditionArchive from "@/components/EditionArchive";
import ReadingProfile from "@/components/ReadingProfile";
import { Article, REGIONS, SUBJECTS, type RegionKey, type SubjectKey } from "@/lib/data";
import {
  ArchivedEdition,
  deduplicateEditionArticles,
  editionDateInKarachi,
  groupEditionArticles,
  readArchivedEditions,
  saveEditionSnapshot,
} from "@/lib/edition-archive";
import { downloadEditionPdf } from "@/lib/edition-pdf";
import { filterArticles, normalizeArticleTaxonomy } from "@/lib/news-classification";
import { clearReadingProfile, EMPTY_READING_PROFILE, getProfileMatches, rankArticlesForProfile, readReadingProfile, saveReadingProfile, type ReadingProfile as ReadingProfileValue } from "@/lib/reading-intelligence";

const PREFERENCES_KEY = "subah:filters:v1";

type Lang = "en" | "ur";
type NewsSource = {
  id: string;
  name: string;
  status: "success" | "partial" | "failed" | string;
  articleCount: number;
  rejectedItems: number;
  error?: string;
};
type NewsPayload = { updatedAt: string; articles: Article[]; sources: NewsSource[]; error?: string };

function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== "object") return false;
  const article = value as Record<string, unknown>;
  return typeof article.id === "string" && article.id.length > 0 &&
    typeof article.title === "string" && article.title.trim().length > 0 &&
    typeof article.summary === "string" && typeof article.sourceName === "string" &&
    typeof article.sourceUrl === "string" && /^https?:\/\//i.test(article.sourceUrl) &&
    typeof article.publishedAt === "string" && Number.isFinite(Date.parse(article.publishedAt)) &&
    Array.isArray(article.topics) && article.topics.every((topic) => typeof topic === "string") &&
    (article.regions === undefined || (Array.isArray(article.regions) && article.regions.every((region) => typeof region === "string"))) &&
    typeof article.readingMinutes === "number" && Number.isFinite(article.readingMinutes);
}

function isNewsPayload(value: unknown): value is NewsPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return typeof payload.updatedAt === "string" && Number.isFinite(Date.parse(payload.updatedAt)) &&
    Array.isArray(payload.articles) && payload.articles.every(isArticle) && Array.isArray(payload.sources) &&
    payload.sources.every((source) => !!source && typeof source === "object" &&
      typeof (source as Record<string, unknown>).name === "string" &&
      typeof (source as Record<string, unknown>).status === "string" &&
      typeof (source as Record<string, unknown>).articleCount === "number" &&
      typeof (source as Record<string, unknown>).rejectedItems === "number");
}

export default function HomeClient({ editionNow }: { editionNow: string }) {
  const [lang, setLang] = useState<Lang>("en");
  const [selectedRegions, setSelectedRegions] = useState<RegionKey[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectKey[]>([]);
  const [readingProfile, setReadingProfile] = useState<ReadingProfileValue>(EMPTY_READING_PROFILE);
  const [forYou, setForYou] = useState(false);
  const readingProfileRef = useRef<ReadingProfileValue>(EMPTY_READING_PROFILE);
  const forYouRef = useRef(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const selectedRegionsRef = useRef<RegionKey[]>([]);
  const selectedSubjectsRef = useRef<SubjectKey[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivedEditions, setArchivedEditions] = useState<ArchivedEdition[]>([]);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [readingProfileError, setReadingProfileError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const isRtl = lang === "ur";

  const saveCurrentEdition = useCallback((nextArticles: Article[]) => {
    if (!preferencesLoaded) return;
    const snapshotArticles = deduplicateEditionArticles(nextArticles);
    const editionDate = editionDateInKarachi(editionNow);
    const leadArticleId = (forYouRef.current
      ? snapshotArticles[0]
      : [...snapshotArticles].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0])?.id ?? null;
    const result = saveEditionSnapshot({
      id: `subah-${editionDate}`,
      editionDate,
      createdAt: new Date().toISOString(),
      subjects: selectedSubjectsRef.current,
      regions: selectedRegionsRef.current,
      articles: snapshotArticles,
      leadArticleId,
    });
    setArchivedEditions(result.editions);
    setArchiveError(result.error);
  }, [editionNow, preferencesLoaded]);

  const loadNews = useCallback(async (refresh = false) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const endpoint = refresh ? "/api/news?refresh=1" : "/api/news";
      const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
      const body: unknown = await response.json();
      if (!isNewsPayload(body)) throw new Error("The news service returned an invalid response.");
      setSources(body.sources);
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "News could not be loaded.");
      const normalizedArticles = body.articles.map(normalizeArticleTaxonomy);
      setArticles(normalizedArticles);
      const filtered = deduplicateEditionArticles(filterArticles(normalizedArticles, selectedRegionsRef.current, selectedSubjectsRef.current));
      saveCurrentEdition(forYouRef.current ? rankArticlesForProfile(filtered, readingProfileRef.current) : filtered);
    } catch (cause) {
      if (controller.signal.aborted) return;
      const message = cause instanceof Error ? cause.message : "News could not be loaded.";
      setError(message);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
        activeRequest.current = null;
      }
    }
  }, [saveCurrentEdition]);

  useEffect(() => {
    const loadArchive = window.setTimeout(() => setArchivedEditions(readArchivedEditions()), 0);
    return () => window.clearTimeout(loadArchive);
  }, []);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const profile = readReadingProfile();
      readingProfileRef.current = profile;
      setReadingProfile(profile);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(PREFERENCES_KEY);
        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (saved && typeof saved === "object") {
            const value = saved as Record<string, unknown>;
            const regions = Array.isArray(value.regions) ? value.regions.filter((item): item is RegionKey => typeof item === "string" && REGIONS.includes(item as RegionKey)) : [];
            const subjects = Array.isArray(value.subjects) ? value.subjects.filter((item): item is SubjectKey => typeof item === "string" && SUBJECTS.includes(item as SubjectKey)) : [];
            selectedRegionsRef.current = regions;
            selectedSubjectsRef.current = subjects;
            setSelectedRegions(regions);
            setSelectedSubjects(subjects);
          }
        }
      } catch { /* Malformed or unavailable storage means All News. */ }
      setPreferencesLoaded(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const handleFiltersChange = useCallback((regions: RegionKey[], subjects: SubjectKey[]) => {
    selectedRegionsRef.current = regions;
    selectedSubjectsRef.current = subjects;
    setSelectedRegions(regions);
    setSelectedSubjects(subjects);
    try {
      if (regions.length === 0 && subjects.length === 0) window.localStorage.removeItem(PREFERENCES_KEY);
      else window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ regions, subjects }));
      setArchiveError(null);
    } catch { setArchiveError("This browser could not save your filter preferences."); }
    if (articles.length) {
      const filtered = deduplicateEditionArticles(filterArticles(articles, regions, subjects));
      saveCurrentEdition(forYouRef.current ? rankArticlesForProfile(filtered, readingProfileRef.current) : filtered);
    }
  }, [articles, saveCurrentEdition]);

  const handleProfileChange = useCallback((profile: ReadingProfileValue) => {
    readingProfileRef.current = profile;
    setReadingProfile(profile);
    if (!saveReadingProfile(profile)) setReadingProfileError("This browser could not save your reading profile.");
    else setReadingProfileError(null);
    if (articles.length) {
      const filtered = deduplicateEditionArticles(filterArticles(articles, selectedRegionsRef.current, selectedSubjectsRef.current));
      saveCurrentEdition(forYouRef.current ? rankArticlesForProfile(filtered, profile) : filtered);
    }
  }, [articles, saveCurrentEdition]);

  const handleForYouChange = useCallback((enabled: boolean) => {
    forYouRef.current = enabled;
    setForYou(enabled);
    if (articles.length) {
      const filtered = deduplicateEditionArticles(filterArticles(articles, selectedRegionsRef.current, selectedSubjectsRef.current));
      saveCurrentEdition(enabled ? rankArticlesForProfile(filtered, readingProfileRef.current) : filtered);
    }
  }, [articles, saveCurrentEdition]);

  const handleProfileReset = useCallback(() => {
    const profile = { ...EMPTY_READING_PROFILE };
    readingProfileRef.current = profile;
    setReadingProfile(profile);
    if (!clearReadingProfile()) setReadingProfileError("This browser could not reset your reading profile.");
    else setReadingProfileError(null);
    if (articles.length && forYouRef.current) {
      saveCurrentEdition(deduplicateEditionArticles(filterArticles(articles, selectedRegionsRef.current, selectedSubjectsRef.current)));
    }
  }, [articles, saveCurrentEdition]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNews(), 0);
    return () => {
      window.clearTimeout(initialLoad);
      activeRequest.current?.abort();
    };
  }, [loadNews]);

  const filteredArticles = deduplicateEditionArticles(filterArticles(articles, selectedRegions, selectedSubjects));
  const displayArticles = forYou ? rankArticlesForProfile(filteredArticles, readingProfile) : filteredArticles;
  const lead = (forYou ? displayArticles : [...displayArticles]
    .filter((article) => Number.isFinite(Date.parse(article.publishedAt)))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)))[0];
  const leadMatches = lead ? getProfileMatches(lead, readingProfile) : { subjects: [], regions: [] };
  const matchedNames = [...leadMatches.subjects.map((item) => lang === "ur" ? SUBJECT_UR[item] : item), ...leadMatches.regions.map((item) => lang === "ur" ? REGION_UR[item] : item)];
  const matchReason = lead && matchedNames.length
    ? (lang === "ur"
      ? `آپ کی پسند سے مطابقت: ${matchedNames.join("، ")}`
      : `Matches your preferred ${matchedNames.join(" and ")}.`)
    : "";

  const sections = groupEditionArticles(displayArticles, lead?.id ?? null);

  const handleDownloadCurrentPdf = async () => {
    setPdfError(null);
    setPdfGenerating(true);
    try {
      await downloadEditionPdf({
        editionDate: editionDateInKarachi(editionNow),
        subjects: selectedSubjects,
        regions: selectedRegions,
        articles: displayArticles,
        leadArticleId: lead?.id ?? null,
      });
    } catch (cause) {
      setPdfError(cause instanceof Error ? cause.message : "PDF generation failed. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleDownloadArchivedPdf = async (edition: ArchivedEdition) => {
    await downloadEditionPdf({
      editionDate: edition.editionDate,
      subjects: edition.subjects,
      regions: edition.regions,
      articles: edition.articles,
      leadArticleId: edition.leadArticleId,
    });
  };

  const sourceStatus = sources.length > 0 && (
    <p className="subah-section__subtitle" aria-label={lang === "ur" ? "ذرائع کی کیفیت" : "News source status"}>
      {sources.map((source) => `${source.name}: ${source.status} (${source.articleCount})`).join(" · ")}
    </p>
  );

  return (
    <div className="subah-root" dir={isRtl ? "rtl" : "ltr"} lang={lang}>
      <Masthead lang={lang} onLangChange={setLang} editionNow={editionNow} />
      <div className="subah-layout">
        <main className="subah-main" id="my-paper">
          <section className="subah-section subah-section--personalize" aria-label="Personalization">
            <div className="subah-section__heading">
              <h2 className="subah-section__title">
                {lang === "ur" ? "صبح بخیر! آج کا سُبح تیار ہے۔" : "Good morning — your Subah is ready."}
              </h2>
              <p className="subah-section__subtitle">
                {lang === "ur" ? "اپنی پسندیدہ موضوعات منتخب کریں اور اپنا اخبار ذاتی بنائیں۔" : "Select topics you care about to personalise your edition."}
              </p>
            </div>
            <TopicSelector selectedRegions={selectedRegions} selectedSubjects={selectedSubjects} onChange={handleFiltersChange} lang={lang} />
            <ReadingProfile profile={readingProfile} onChange={handleProfileChange} onReset={handleProfileReset} forYou={forYou} onForYouChange={handleForYouChange} storageError={readingProfileError} lang={lang} />
          </section>

          <div className="subah-rule" role="separator" />

          <div id="explore">
          {loading && articles.length === 0 ? (
            <section className="subah-section" aria-live="polite" aria-busy="true">
              <h2 className="subah-section__title">{lang === "ur" ? "تازہ خبریں لوڈ ہو رہی ہیں…" : "Loading the latest news…"}</h2>
            </section>
          ) : error && articles.length === 0 ? (
            <section className="subah-section" role="alert">
              <h2 className="subah-section__title">{lang === "ur" ? "خبریں لوڈ نہیں ہو سکیں" : "News could not be loaded"}</h2>
              <p className="subah-section__subtitle">{error}</p>
              {sourceStatus}
              <button className="subah-btn subah-btn--outline" onClick={() => void loadNews()}>
                {lang === "ur" ? "دوبارہ کوشش کریں" : "Try again"}
              </button>
            </section>
          ) : articles.length === 0 ? (
            <section className="subah-section" aria-live="polite">
              <h2 className="subah-section__title">{lang === "ur" ? "اس وقت کوئی خبر دستیاب نہیں" : "No articles are available right now"}</h2>
              {sourceStatus}
            </section>
          ) : (
            <>
              {error && <section className="subah-section" role="alert"><p>{error}</p><button className="subah-btn subah-btn--outline" onClick={() => void loadNews(true)}>{lang === "ur" ? "دوبارہ کوشش کریں" : "Retry"}</button></section>}
              {refreshing && <p className="subah-demo-note" aria-live="polite">{lang === "ur" ? "خبریں تازہ کی جا رہی ہیں…" : "Refreshing news…"}</p>}
              {displayArticles.length === 0 ? (
                <section className="subah-section" role="status">
                  <h2 className="subah-section__title">{lang === "ur" ? "ان فلٹرز سے کوئی خبر نہیں ملی" : "No articles match these filters"}</h2>
                  <p className="subah-section__subtitle">{lang === "ur" ? "فلٹر صاف کر کے تمام خبریں دیکھیں۔" : "Clear your filters to see all available news."}</p>
                  <button className="subah-btn subah-btn--outline" onClick={() => handleFiltersChange([], [])}>{lang === "ur" ? "تمام خبریں دکھائیں" : "Clear filters"}</button>
                </section>
              ) : <>
              {lead && <LeadStory article={lead} matchReason={matchReason} lang={lang} />}
              <div className="subah-rule" role="separator" />
              {sections.map((section) => (
                <section key={section.id} className="subah-section" id={section.id} aria-label={section.label[lang]} lang={lang} dir={isRtl ? "rtl" : "ltr"}>
                  <h2 className="subah-section__title subah-section__title--ruled">{section.label[lang]}</h2>
                  <div className="subah-cards-grid">
                    {section.articles.map((article) => {
                      const matches = getProfileMatches(article, readingProfile);
                      const names = [...matches.subjects.map((item) => lang === "ur" ? SUBJECT_UR[item] : item), ...matches.regions.map((item) => lang === "ur" ? REGION_UR[item] : item)];
                      const whyThisStory = names.length
                        ? lang === "ur" ? `آپ کی پسند سے مطابقت: ${names.join("، ")}` : `Matches your preferred ${names.join(" and ")}.`
                        : null;
                      return <ArticleCard key={article.id} article={article} lang={lang} editionNow={editionNow} whyThisStory={whyThisStory} />;
                    })}
                  </div>
                </section>
              ))}
              {sourceStatus}
              </>}
            </>
          )}
          </div>

          <div className="subah-rule" role="separator" />
          <AskSubah lang={lang} />
        </main>
        <aside className="subah-sidebar">
          <EditionActions
            lang={lang}
            onDownloadPdf={() => void handleDownloadCurrentPdf()}
            pdfGenerating={pdfGenerating}
            pdfError={pdfError}
            onOpenArchive={() => setArchiveOpen(true)}
            onRefresh={() => loadNews(true)}
            refreshing={refreshing}
          />
        </aside>
      </div>
      <EditionArchive
        open={archiveOpen}
        editions={archivedEditions}
        lang={lang}
        storageError={archiveError}
        onClose={() => setArchiveOpen(false)}
        onDownload={handleDownloadArchivedPdf}
      />
      <footer className="subah-footer" role="contentinfo">
        <p><strong>SUBAH</strong>{" "}{lang === "ur" ? "— ہیکاتھون پروجیکٹ · براہ راست خبریں" : "— Hackathon Project · Live publisher headlines"}</p>
      </footer>
    </div>
  );
}
