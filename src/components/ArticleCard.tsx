"use client";

import { useState } from "react";
import { Article, TopicKey } from "@/lib/data";

type Lang = "en" | "ur";

interface ArticleCardProps {
  article: Article;
  lang: Lang;
  selectedTopics: TopicKey[];
  editionNow: string;
}

/**
 * Format a relative time string from an ISO timestamp.
 * Called only on the client (inside useEffect) because Date.now() is
 * unstable during prerendering — it differs between server and client.
 */
function formatRelativeTime(iso: string, editionNow: string, lang: Lang): string {
  const diff = new Date(editionNow).getTime() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  const mins = Math.floor(diff / 60_000);
  if (lang === "ur") {
    if (hrs >= 1) return `${hrs} گھنٹے پہلے`;
    return `${mins} منٹ پہلے`;
  }
  if (hrs >= 1) return `${hrs}h ago`;
  return `${mins}m ago`;
}

export default function ArticleCard({ article, lang, selectedTopics, editionNow }: ArticleCardProps) {
  const [liked, setLiked] = useState(false);
  const [skipped, setSkipped] = useState(false);

  /**
   * `relativeTime` starts null so server and initial client output match.
   * useEffect sets the real value after mount, avoiding a hydration mismatch
   * from Date.now() differing between server prerender and client execution.
   */
  const relativeTime = formatRelativeTime(article.publishedAt, editionNow, lang);

  const isRelevant =
    selectedTopics.length === 0 ||
    article.topics.some((t) => selectedTopics.includes(t as TopicKey));

  if (skipped) {
    return (
      <div className="subah-card subah-card--skipped" aria-label="Article skipped">
        <span className="subah-skipped-msg">
          {lang === "ur" ? "یہ مضمون چھوڑ دیا گیا" : "Article skipped"}
        </span>
        <button
          className="subah-undo-btn"
          onClick={() => setSkipped(false)}
          aria-label={lang === "ur" ? "واپس لائیں" : "Undo skip"}
        >
          {lang === "ur" ? "واپس لائیں" : "Undo"}
        </button>
      </div>
    );
  }

  return (
    <article
      className={`subah-card${liked ? " subah-card--liked" : ""}${!isRelevant ? " subah-card--dim" : ""}`}
    >
      <div className="subah-card__meta">
        <span className="subah-card__source">{article.sourceName}</span>
        <span className="subah-card__dot">·</span>
        <time
          className="subah-card__time"
          dateTime={article.publishedAt}
          lang={lang === "ur" ? "ur" : "en"}
          dir={lang === "ur" ? "rtl" : "ltr"}
        >
          {relativeTime}
        </time>
        <span className="subah-card__dot">·</span>
        <span className="subah-card__read">
          {lang === "ur"
            ? `${article.readingMinutes} منٹ`
            : `${article.readingMinutes} min read`}
        </span>
      </div>

      {/*
       * Article headlines, summaries, and source names are in English only.
       * The interface language (Urdu/English) controls UI labels, navigation,
       * and controls. Article content is not automatically translated.
       * lang="en" preserves correct LTR rendering for English text even when
       * the overall page direction is RTL.
       */}
      <h3 className="subah-card__title" lang="en" dir="ltr">
        {article.title}
      </h3>
      <p className="subah-card__summary" lang="en" dir="ltr">
        {article.summary}
      </p>

      <div className="subah-card__tags">
        {article.topics.map((t) => (
          <span key={t} className="subah-tag" lang="en">
            {t}
          </span>
        ))}
      </div>

      {/* Content-language notice shown only in Urdu mode */}
      {lang === "ur" && (
        <p className="subah-content-lang-note">
          مضمون کا متن انگریزی میں ہے — خودکار ترجمہ اگلے مرحلے میں آئے گا۔
        </p>
      )}

      <div className="subah-card__actions">
        <button
          className={`subah-action-btn${liked ? " subah-action-btn--liked" : ""}`}
          onClick={() => setLiked((v) => !v)}
          aria-pressed={liked}
          aria-label={liked
            ? lang === "ur" ? "پسند ہٹائیں" : "Unlike"
            : lang === "ur" ? "پسند کریں" : "Like"}
        >
          <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
          {lang === "ur" ? "پسند" : "Like"}
        </button>
        <button
          className="subah-action-btn"
          onClick={() => setSkipped(true)}
          aria-label={lang === "ur" ? "یہ مضمون چھوڑیں" : "Skip this article"}
        >
          <span aria-hidden="true">✕</span>
          {lang === "ur" ? "چھوڑیں" : "Skip"}
        </button>
        {/*
         * All sample sourceUrl values begin with "#demo-" (not "http"),
         * so this link is intentionally hidden for all sample articles.
         * Real source links will be added when live RSS feeds are connected.
         */}
        {article.sourceUrl.startsWith("http") && (
          <a
            href={article.sourceUrl}
            className="subah-action-btn subah-action-btn--link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Read full article: ${article.title}`}
          >
            {lang === "ur" ? "مکمل پڑھیں ↗" : "Full story ↗"}
          </a>
        )}
      </div>
    </article>
  );
}
