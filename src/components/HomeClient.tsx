"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Masthead from "@/components/Masthead";
import TopicSelector from "@/components/TopicSelector";
import LeadStory from "@/components/LeadStory";
import ArticleCard from "@/components/ArticleCard";
import AskSubah from "@/components/AskSubah";
import EditionActions from "@/components/EditionActions";
import EditionArchive from "@/components/EditionArchive";
import { Article, TopicKey } from "@/lib/data";
import {
  ArchivedEdition,
  deduplicateEditionArticles,
  editionDateInKarachi,
  groupEditionArticles,
  readArchivedEditions,
  saveEditionSnapshot,
} from "@/lib/edition-archive";
import { downloadEditionPdf } from "@/lib/edition-pdf";

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
  const [selectedTopics, setSelectedTopics] = useState<TopicKey[]>(["Artificial Intelligence", "Pakistan"]);
  const selectedTopicsRef = useRef(selectedTopics);
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivedEditions, setArchivedEditions] = useState<ArchivedEdition[]>([]);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const isRtl = lang === "ur";

  const handleTopicsChange = useCallback((topics: TopicKey[]) => {
    selectedTopicsRef.current = topics;
    setSelectedTopics(topics);
  }, []);

  const saveCurrentEdition = useCallback((nextArticles: Article[]) => {
    const snapshotArticles = deduplicateEditionArticles(nextArticles);
    if (snapshotArticles.length === 0) return;
    const editionDate = editionDateInKarachi(editionNow);
    const leadArticleId = [...snapshotArticles]
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0]?.id ?? null;
    const result = saveEditionSnapshot({
      id: `subah-${editionDate}`,
      editionDate,
      createdAt: new Date().toISOString(),
      topics: selectedTopicsRef.current,
      articles: snapshotArticles,
      leadArticleId,
    });
    setArchivedEditions(result.editions);
    setArchiveError(result.error);
  }, [editionNow]);

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
      setArticles(body.articles);
      saveCurrentEdition(body.articles);
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
    const initialLoad = window.setTimeout(() => void loadNews(), 0);
    return () => {
      window.clearTimeout(initialLoad);
      activeRequest.current?.abort();
    };
  }, [loadNews]);

  const displayArticles = deduplicateEditionArticles(articles);
  const lead = [...displayArticles]
    .filter((article) => Number.isFinite(Date.parse(article.publishedAt)))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0];
  const leadMatches = lead?.topics.filter((topic) => selectedTopics.includes(topic as TopicKey)) ?? [];
  const matchReason = leadMatches.length
    ? (lang === "ur" ? `آپ کی دلچسپی کے موضوعات: ${leadMatches.join("، ")}` : `Matches your interests in ${leadMatches.join(" and ")}.`)
    : (lang === "ur" ? `${lead?.sourceName ?? ""} سے تازہ خبر` : `Latest from ${lead?.sourceName ?? "the publisher"}.`);

  const sections = groupEditionArticles(displayArticles, lead?.id ?? null);

  const handleDownloadCurrentPdf = async () => {
    setPdfError(null);
    setPdfGenerating(true);
    try {
      await downloadEditionPdf({
        editionDate: editionDateInKarachi(editionNow),
        topics: selectedTopics,
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
      topics: edition.topics,
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
            <TopicSelector selected={selectedTopics} onChange={handleTopicsChange} lang={lang} />
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
              {lead && <LeadStory article={lead} matchReason={matchReason} lang={lang} selectedTopics={selectedTopics} />}
              <div className="subah-rule" role="separator" />
              {sections.map((section) => (
                <section key={section.id} className="subah-section" id={section.id} aria-label={section.label[lang]} lang={lang} dir={isRtl ? "rtl" : "ltr"}>
                  <h2 className="subah-section__title subah-section__title--ruled">{section.label[lang]}</h2>
                  <div className="subah-cards-grid">
                    {section.articles.map((article) => <ArticleCard key={article.id} article={article} lang={lang} selectedTopics={selectedTopics} editionNow={editionNow} />)}
                  </div>
                </section>
              ))}
              {sourceStatus}
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
