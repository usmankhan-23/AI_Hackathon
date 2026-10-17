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
import AccountAuth, { type AccountIdentity } from "@/components/AccountAuth";
import { Article, REGIONS, SUBJECTS, type RegionKey, type SubjectKey } from "@/lib/data";
import {
  ArchivedEdition,
  deduplicateEditionArticles,
  editionDateInKarachi,
  groupEditionArticles,
  migrateArchivedEdition,
  readArchivedEditions,
  saveEditionSnapshot,
} from "@/lib/edition-archive";
import { downloadEditionPdf } from "@/lib/edition-pdf";
import { filterArticles, normalizeArticleTaxonomy } from "@/lib/news-classification";
import { clearReadingProfile, EMPTY_READING_PROFILE, getProfileMatches, normalizeReadingProfile, rankArticlesForProfile, readReadingProfile, saveReadingProfile, type ReadingProfile as ReadingProfileValue } from "@/lib/reading-intelligence";

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
type LocalMigration = { profile: ReadingProfileValue | null; editions: ArchivedEdition[] };

function mergeEditionLists(remote: ArchivedEdition[], local: ArchivedEdition[]): ArchivedEdition[] {
  const merged = new Map<string, ArchivedEdition>();
  for (const edition of local) merged.set(edition.id, edition);
  for (const edition of remote) merged.set(edition.id, edition);
  return [...merged.values()].sort((a, b) => b.editionDate.localeCompare(a.editionDate));
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

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
  const [account, setAccount] = useState<AccountIdentity | null>(null);
  const [accountSyncLoading, setAccountSyncLoading] = useState(false);
  const [accountSyncError, setAccountSyncError] = useState<string | null>(null);
  const [pendingMigration, setPendingMigration] = useState<LocalMigration | null>(null);
  const accountIdRef = useRef<string | null>(null);
  const cloudReadyRef = useRef(false);
  const cloudWritesAllowedRef = useRef(false);
  const cloudInitialSaveForRef = useRef<string | null>(null);
  const profileWriteQueue = useRef<Promise<void>>(Promise.resolve());
  const editionWriteQueue = useRef<Promise<void>>(Promise.resolve());
  const [readingProfileError, setReadingProfileError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const isRtl = lang === "ur";

  const saveCloudProfile = useCallback((profile: ReadingProfileValue) => {
    if (!accountIdRef.current || !cloudReadyRef.current || !cloudWritesAllowedRef.current) return;
    const expectedAccountId = accountIdRef.current;
    profileWriteQueue.current = profileWriteQueue.current.then(async () => {
      if (accountIdRef.current !== expectedAccountId) return;
      const response = await fetch("/api/account/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile), cache: "no-store",
      });
      if (!response.ok) throw new Error("Your account profile could not be synced.");
      setAccountSyncError(null);
    }).catch((cause: unknown) => {
      if (accountIdRef.current === expectedAccountId) setAccountSyncError(cause instanceof Error ? cause.message : "Your account profile could not be synced.");
    });
  }, []);

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
    if (accountIdRef.current && cloudReadyRef.current && cloudWritesAllowedRef.current) {
      const expectedAccountId = accountIdRef.current;
      const snapshot = result.editions.find((edition) => edition.id === `subah-${editionDate}`) ?? result.editions[0];
      if (snapshot) {
        editionWriteQueue.current = editionWriteQueue.current.then(async () => {
          if (accountIdRef.current !== expectedAccountId) return;
          const response = await fetch("/api/account/editions", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(snapshot), cache: "no-store",
          });
          if (!response.ok) throw new Error("This edition could not be synced to your account.");
          setAccountSyncError(null);
        }).catch((cause: unknown) => {
          if (accountIdRef.current === expectedAccountId) setAccountSyncError(cause instanceof Error ? cause.message : "This edition could not be synced to your account.");
        });
      }
    }
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

  const handleAccountChange = useCallback((identity: AccountIdentity | null) => {
    if (identity?.id === accountIdRef.current) {
      setAccount(identity);
      return;
    }
    accountIdRef.current = identity?.id ?? null;
    cloudReadyRef.current = false;
    cloudWritesAllowedRef.current = false;
    cloudInitialSaveForRef.current = null;
    setAccount(identity);
    setPendingMigration(null);
    setAccountSyncError(null);
    setAccountSyncLoading(Boolean(identity));
    if (!identity) {
      cloudReadyRef.current = false;
      setAccountSyncLoading(false);
      const localProfile = readReadingProfile();
      readingProfileRef.current = localProfile;
      setReadingProfile(localProfile);
      setArchivedEditions(readArchivedEditions());
    }
  }, []);

  useEffect(() => {
    const accountId = account?.id;
    if (!accountId) return;
    const controller = new AbortController();

    async function loadAccountData() {
      try {
        const [profileResponse, editionsResponse] = await Promise.all([
          fetch("/api/account/profile", { cache: "no-store", signal: controller.signal }),
          fetch("/api/account/editions", { cache: "no-store", signal: controller.signal }),
        ]);
        const [profileBody, editionsBody] = await Promise.all([
          profileResponse.json() as Promise<{ profile?: unknown; error?: string }>,
          editionsResponse.json() as Promise<{ editions?: unknown; error?: string }>,
        ]);
        if (!profileResponse.ok || !editionsResponse.ok) {
          throw new Error(profileBody.error || editionsBody.error || "Account data could not be loaded.");
        }

        const cloudProfile = profileBody.profile === null || profileBody.profile === undefined
          ? EMPTY_READING_PROFILE
          : normalizeReadingProfile(profileBody.profile);
        const remoteEditions = Array.isArray(editionsBody.editions)
          ? editionsBody.editions.map(migrateArchivedEdition).filter((item): item is ArchivedEdition => item !== null)
          : [];
        const localProfile = readReadingProfile();
        const localEditions = readArchivedEditions();
        const profileNeedsImport = (localProfile.regions.length > 0 || localProfile.subjects.length > 0) &&
          JSON.stringify(localProfile) !== JSON.stringify(cloudProfile);
        const localEditionsNeedingImport = localEditions.filter((localEdition) => {
          const cloudEdition = remoteEditions.find((edition) => edition.id === localEdition.id);
          return !cloudEdition || stableSerialize(cloudEdition) !== stableSerialize(localEdition);
        });
        const migration = profileNeedsImport || localEditionsNeedingImport.length > 0
          ? { profile: profileNeedsImport ? localProfile : null, editions: localEditionsNeedingImport }
          : null;

        if (accountIdRef.current !== accountId || controller.signal.aborted) return;
        readingProfileRef.current = cloudProfile;
        setReadingProfile(cloudProfile);
        setArchivedEditions(mergeEditionLists(remoteEditions, localEditions));
        setPendingMigration(migration);
        cloudReadyRef.current = true;
        cloudWritesAllowedRef.current = migration === null;
        setAccountSyncLoading(false);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setAccountSyncError(cause instanceof Error ? cause.message : "Account data could not be loaded.");
        setArchivedEditions(readArchivedEditions());
        setAccountSyncLoading(false);
      }
    }

    void loadAccountData();
    return () => controller.abort();
  }, [account?.id]);

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
    const profileHasSelections = profile.regions.length > 0 || profile.subjects.length > 0;
    if (pendingMigration && !profileHasSelections && pendingMigration.editions.length === 0) {
      cloudWritesAllowedRef.current = true;
      setPendingMigration(null);
    } else if (pendingMigration) {
      setPendingMigration((current) => current ? { ...current, profile: profileHasSelections ? profile : null } : current);
    }
    saveCloudProfile(profile);
    if (articles.length) {
      const filtered = deduplicateEditionArticles(filterArticles(articles, selectedRegionsRef.current, selectedSubjectsRef.current));
      saveCurrentEdition(forYouRef.current ? rankArticlesForProfile(filtered, profile) : filtered);
    }
  }, [articles, pendingMigration, saveCloudProfile, saveCurrentEdition]);

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
    if (pendingMigration && pendingMigration.editions.length === 0) {
      cloudWritesAllowedRef.current = true;
      setPendingMigration(null);
    } else if (pendingMigration) {
      setPendingMigration((current) => current ? { ...current, profile: null } : current);
    }
    saveCloudProfile(profile);
    if (articles.length && forYouRef.current) {
      saveCurrentEdition(deduplicateEditionArticles(filterArticles(articles, selectedRegionsRef.current, selectedSubjectsRef.current)));
    }
  }, [articles, pendingMigration, saveCloudProfile, saveCurrentEdition]);

  const keepCloudData = useCallback(() => {
    cloudWritesAllowedRef.current = true;
    cloudInitialSaveForRef.current = null;
    setPendingMigration(null);
    setAccountSyncError(null);
  }, []);

  const importLocalData = useCallback(async () => {
    if (!pendingMigration || !accountIdRef.current) return;
    const expectedAccountId = accountIdRef.current;
    setAccountSyncLoading(true);
    setAccountSyncError(null);
    cloudWritesAllowedRef.current = false;
    try {
      if (pendingMigration.profile) {
        if (accountIdRef.current !== expectedAccountId) return;
        const response = await fetch("/api/account/profile", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingMigration.profile), cache: "no-store",
        });
        if (!response.ok) throw new Error("The local reading profile could not be imported.");
        readingProfileRef.current = pendingMigration.profile;
        setReadingProfile(pendingMigration.profile);
      }
      for (const edition of pendingMigration.editions) {
        if (accountIdRef.current !== expectedAccountId) return;
        const response = await fetch("/api/account/editions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(edition), cache: "no-store",
        });
        if (!response.ok) throw new Error("Some local editions could not be imported. Your browser copies remain intact.");
      }
      if (accountIdRef.current !== expectedAccountId) return;
      const response = await fetch("/api/account/editions", { cache: "no-store" });
      if (!response.ok) throw new Error("The imported editions could not be reloaded.");
      const body = await response.json() as { editions?: unknown };
      const remote = Array.isArray(body.editions) ? body.editions.map(migrateArchivedEdition).filter((item): item is ArchivedEdition => item !== null) : [];
      setArchivedEditions(mergeEditionLists(remote, readArchivedEditions()));
      cloudInitialSaveForRef.current = accountIdRef.current;
      cloudWritesAllowedRef.current = true;
      setPendingMigration(null);
      setAccountSyncError(null);
    } catch (cause) {
      setAccountSyncError(cause instanceof Error ? cause.message : "Local data could not be imported.");
    } finally {
      setAccountSyncLoading(false);
    }
  }, [pendingMigration]);

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

  useEffect(() => {
    if (!account?.id || accountSyncLoading || pendingMigration || accountSyncError || !cloudReadyRef.current ||
      !cloudWritesAllowedRef.current || !preferencesLoaded || displayArticles.length === 0 ||
      cloudInitialSaveForRef.current === account.id) return;
    cloudInitialSaveForRef.current = account.id;
    saveCurrentEdition(displayArticles);
  }, [account?.id, accountSyncLoading, accountSyncError, pendingMigration, preferencesLoaded, displayArticles, saveCurrentEdition]);

  const archiveSyncStatus = !account ? "local" : accountSyncLoading ? "syncing" : pendingMigration ? "migration" : accountSyncError ? "local" : "synced";

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
            <AccountAuth lang={lang} onAuthChange={handleAccountChange} />
            {accountSyncLoading && <p className="subah-filter-help" role="status">{lang === "ur" ? "اکاؤنٹ ڈیٹا لوڈ ہو رہا ہے…" : "Loading your account data…"}</p>}
            {accountSyncError && <p className="subah-profile-error" role="alert">{accountSyncError}</p>}
            {pendingMigration && <div className="subah-account-migration" role="group" aria-label={lang === "ur" ? "مقامی ڈیٹا کی منتقلی" : "Local data migration"}>
              <p>{lang === "ur"
                ? `اس براؤزر میں ${pendingMigration.editions.length} ایڈیشن${pendingMigration.profile ? " اور ایک مطالعہ پروفائل" : ""} موجود ہیں۔ یہ ڈیٹا حذف نہیں ہوگا۔ کیا آپ اسے اپنے اکاؤنٹ میں درآمد کرنا چاہتے ہیں؟`
                : `This browser has ${pendingMigration.editions.length} saved edition${pendingMigration.editions.length === 1 ? "" : "s"}${pendingMigration.profile ? " and a reading profile" : ""}. Local copies will remain. Import them into this account?`}</p>
              <div className="subah-account__tabs">
                <button type="button" className="subah-btn subah-btn--primary" disabled={accountSyncLoading} onClick={() => void importLocalData()}>{lang === "ur" ? "مقامی ڈیٹا درآمد کریں" : "Import local data"}</button>
                <button type="button" className="subah-btn subah-btn--outline" disabled={accountSyncLoading} onClick={keepCloudData}>{lang === "ur" ? "اکاؤنٹ کا ڈیٹا رکھیں" : "Keep account data"}</button>
              </div>
            </div>}
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
        accountError={accountSyncError}
        syncStatus={archiveSyncStatus}
        onClose={() => setArchiveOpen(false)}
        onDownload={handleDownloadArchivedPdf}
      />
      <footer className="subah-footer" role="contentinfo">
        <p><strong>SUBAH</strong>{" "}{lang === "ur" ? "— ہیکاتھون پروجیکٹ · براہ راست خبریں" : "— Hackathon Project · Live publisher headlines"}</p>
      </footer>
    </div>
  );
}
