"use client";

import { useState } from "react";
import type { Article } from "@/lib/data";
import { ArchivedEdition, groupEditionArticles } from "@/lib/edition-archive";

type Lang = "en" | "ur";

interface EditionArchiveProps {
  open: boolean;
  editions: ArchivedEdition[];
  lang: Lang;
  storageError: string | null;
  accountError?: string | null;
  syncStatus?: "local" | "syncing" | "synced" | "migration";
  onClose: () => void;
  onDownload: (edition: ArchivedEdition) => Promise<void>;
}

function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-US", {
    timeZone: "Asia/Karachi", dateStyle: "full",
  }).format(new Date(iso));
}

function SnapshotArticle({ article, lang }: { article: Article; lang: Lang }) {
  return (
    <article className="subah-card">
      <div className="subah-card__meta">
        <span className="subah-card__source" lang="en" dir="ltr">{article.sourceName}</span>
        <span className="subah-card__dot" aria-hidden="true">·</span>
        <time dateTime={article.publishedAt} lang={lang} dir={lang === "ur" ? "rtl" : "ltr"}>
          {formatDate(article.publishedAt, lang)}
        </time>
      </div>
      <h3 className="subah-card__title" dir="auto">{article.title}</h3>
      {article.summary && <p className="subah-card__summary" dir="auto">{article.summary}</p>}
      <div className="subah-card__tags">
        {article.topics.map((topic) => <span className="subah-tag" key={topic}>{topic}</span>)}
        {article.regions.map((region) => <span className="subah-tag subah-tag--region" key={region}>{region}</span>)}
      </div>
      <a className="subah-action-btn subah-action-btn--link" href={article.sourceUrl} target="_blank" rel="noopener noreferrer">
        {lang === "ur" ? "اصل خبر کھولیں ↗" : "Open original story ↗"}
      </a>
    </article>
  );
}

export default function EditionArchive({ open, editions, lang, storageError, accountError, syncStatus = "local", onClose, onDownload }: EditionArchiveProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  if (!open) return null;

  const selectedEdition = editions.find((edition) => edition.id === selectedId);
  const rtl = lang === "ur";

  return (
    <div className="subah-archive-backdrop">
      <section className="subah-archive-dialog" role="dialog" aria-modal="true" aria-labelledby="subah-archive-title" lang={lang} dir={rtl ? "rtl" : "ltr"}>
        <header className="subah-archive-dialog__header">
          <div>
            <p className="subah-section-label">SUBAH</p>
            <h2 className="subah-section__title" id="subah-archive-title">
              {selectedEdition
                ? formatDate(`${selectedEdition.editionDate}T12:00:00Z`, lang)
                : lang === "ur" ? "پچھلے ایڈیشن" : "Previous Editions"}
            </h2>
          </div>
          <div className="subah-archive-dialog__actions">
            {selectedEdition && (
              <>
                <button className="subah-btn subah-btn--outline" onClick={() => { setSelectedId(null); setPdfError(null); }}>
                  {lang === "ur" ? "فہرست پر واپس" : "Back to editions"}
                </button>
                <button className="subah-btn subah-btn--primary" onClick={() => void onDownload(selectedEdition).catch((error: unknown) => setPdfError(error instanceof Error ? error.message : "PDF export failed."))}>
                  {lang === "ur" ? "PDF ڈاؤن لوڈ" : "Download PDF"}
                </button>
              </>
            )}
            <button className="subah-btn subah-btn--outline" onClick={onClose} aria-label={lang === "ur" ? "آرکائیو بند کریں" : "Close archive"}>
              {lang === "ur" ? "بند کریں" : "Close"}
            </button>
          </div>
        </header>

        {storageError && <p role="alert" className="subah-archive-message">{lang === "ur" ? "اس براؤزر میں ایڈیشن محفوظ نہیں ہو سکا۔" : storageError}</p>}
        {accountError && <p role="alert" className="subah-archive-message">{accountError}</p>}
        {pdfError && <p role="alert" className="subah-archive-message">{pdfError}</p>}

        {selectedEdition ? (
          <div className="subah-archive-reading">
            <p className="subah-section__subtitle">
              {lang === "ur" ? "منتخب علاقے:" : "Selected regions:"} {selectedEdition.regions.join(" · ") || (lang === "ur" ? "تمام" : "All")}<br />
              {lang === "ur" ? "منتخب موضوعات:" : "Selected subjects:"} {selectedEdition.subjects.join(" · ") || (lang === "ur" ? "تمام" : "All")}
            </p>
            {selectedEdition.articles.find((article) => article.id === selectedEdition.leadArticleId) && (
              <section className="subah-section">
                <h3 className="subah-section__title subah-section__title--ruled">{lang === "ur" ? "آج کی بڑی خبر" : "Lead Story"}</h3>
                <SnapshotArticle article={selectedEdition.articles.find((article) => article.id === selectedEdition.leadArticleId)!} lang={lang} />
              </section>
            )}
            {groupEditionArticles(selectedEdition.articles, selectedEdition.leadArticleId).map((group) => (
              <section className="subah-section" key={group.id}>
                <h3 className="subah-section__title subah-section__title--ruled">{group.label[lang]}</h3>
                <div className="subah-cards-grid">
                  {group.articles.map((article) => <SnapshotArticle key={article.id} article={article} lang={lang} />)}
                </div>
              </section>
            ))}
          </div>
        ) : editions.length === 0 ? (
          <div className="subah-archive-empty" role="status">
            <h3>{lang === "ur" ? "ابھی کوئی پچھلا ایڈیشن محفوظ نہیں" : "No previous editions yet"}</h3>
            <p>{lang === "ur" ? "تازہ خبریں لوڈ ہونے پر آج کا ایڈیشن اس براؤزر میں محفوظ ہوگا۔" : "Today’s edition will be saved in this browser when its news loads."}</p>
          </div>
        ) : (
          <div className="subah-archive-list">
            {editions.map((edition) => (
              <article className="subah-archive-entry" key={edition.id}>
                <div>
                  <h3>{formatDate(`${edition.editionDate}T12:00:00Z`, lang)}</h3>
                  <p>{edition.articles.length} {lang === "ur" ? "مضامین" : "articles"} · {lang === "ur" ? "علاقے" : "Regions"}: {edition.regions.join(" · ") || (lang === "ur" ? "تمام" : "All")} · {lang === "ur" ? "موضوعات" : "Subjects"}: {edition.subjects.join(" · ") || (lang === "ur" ? "تمام" : "All")}</p>
                  <small>{lang === "ur" ? "محفوظ ہونے کا وقت:" : "Saved:"} {new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(edition.createdAt))}</small>
                </div>
                <div className="subah-archive-dialog__actions">
                  <button className="subah-btn subah-btn--outline" onClick={() => { setSelectedId(edition.id); setPdfError(null); }}>
                    {lang === "ur" ? "ایڈیشن پڑھیں" : "Open edition"}
                  </button>
                  <button className="subah-btn subah-btn--outline" onClick={() => void onDownload(edition).catch((error: unknown) => setPdfError(error instanceof Error ? error.message : "PDF export failed."))}>
                    {lang === "ur" ? "PDF" : "Download PDF"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="subah-archive-local-note">
          {syncStatus === "synced"
            ? (lang === "ur" ? "ایڈیشن آپ کے اکاؤنٹ سے ہم آہنگ ہیں؛ براؤزر میں موجود کاپیاں بھی محفوظ رہتی ہیں۔" : "Editions sync to your account; browser copies are kept too.")
            : syncStatus === "syncing"
              ? (lang === "ur" ? "آپ کے اکاؤنٹ کے ایڈیشن لوڈ ہو رہے ہیں۔" : "Loading editions from your account.")
              : syncStatus === "migration"
                ? (lang === "ur" ? "مقامی ایڈیشن برقرار ہیں؛ درآمد کے لیے اوپر تصدیق کریں۔" : "Local editions are preserved; confirm above to import them.")
                : (lang === "ur" ? "یہ آرکائیو صرف اس براؤزر میں محفوظ ہے؛ دوسرے آلات سے ہم آہنگ نہیں۔" : "This archive is stored only in this browser and is not synced across devices.")}
        </p>
      </section>
    </div>
  );
}
