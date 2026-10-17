"use client";

import { Article, TopicKey } from "@/lib/data";

type Lang = "en" | "ur";

interface LeadStoryProps {
  article: Article;
  matchReason: string;
  lang: Lang;
  selectedTopics: TopicKey[];
}

/**
 * Format a full publication date with timezone.
 * The input is fixed article data, so this formatter is deterministic.
 */
function formatDateKarachi(iso: string, lang: Lang): string {
  const d = new Date(iso);
  const locale = lang === "ur" ? "ur-PK" : "en-US";
  return d.toLocaleString(locale, {
    timeZone: "Asia/Karachi",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeadStory({ article, matchReason, lang }: LeadStoryProps) {
  const formattedDate = formatDateKarachi(article.publishedAt, lang);

  return (
    <section className="subah-lead" aria-label="Lead story" id="lead-story">
      <div className="subah-lead__eyebrow">
        <span className="subah-lead__label">
          {lang === "ur" ? "آج کی بڑی خبر" : "Lead Story"}
        </span>
        {article.topics.map((t) => (
          <span key={t} className="subah-tag subah-tag--lead" lang="en">
            {t}
          </span>
        ))}
      </div>

      {/*
       * Article title and summary are English-language content.
       * lang="en" dir="ltr" keeps them left-to-right even when the
       * page is in Urdu (RTL) mode. Content is not auto-translated.
       */}
      <h2 className="subah-lead__title" lang="en" dir="ltr">
        {article.title}
      </h2>
      <p className="subah-lead__summary" lang="en" dir="ltr">
        {article.summary}
      </p>

      {/* Content-language notice in Urdu mode */}
      {lang === "ur" && (
        <p className="subah-content-lang-note subah-content-lang-note--lead">
          بڑی خبر کا متن انگریزی میں ہے — ترجمہ کی سہولت اگلے مرحلے میں شامل ہوگی۔
        </p>
      )}

      <div className="subah-lead__meta">
        <span className="subah-lead__source" lang="en">{article.sourceName}</span>
        <span className="subah-card__dot">·</span>
        <time dateTime={article.publishedAt} lang={lang === "ur" ? "ur" : "en"} dir={lang === "ur" ? "rtl" : "ltr"}>
          {formattedDate}
        </time>
        <span className="subah-card__dot">·</span>
        <span>
          {lang === "ur"
            ? `${article.readingMinutes} منٹ مطالعہ`
            : `${article.readingMinutes} min read`}
        </span>
      </div>

      <div className="subah-lead__match">
        <span className="subah-match-icon" aria-hidden="true">✦</span>
        {matchReason}
      </div>

      <div className="subah-lead__actions">
        {/*
         * The lead story source URL is "#demo-lead-source" — a clearly
         * labeled placeholder. The button is intentionally non-functional
         * in this demo stage. The note below makes this explicit.
         */}
        <a
          href={article.sourceUrl}
          className="subah-btn subah-btn--primary subah-btn--demo"
          aria-label={`[Demo] ${article.title}`}
          aria-disabled="true"
          role="button"
          tabIndex={0}
        >
          {lang === "ur" ? "مکمل مضمون پڑھیں" : "Read Full Story"}
          <span aria-hidden="true"> ↗</span>
        </a>
        <span className="subah-demo-note">
          {lang === "ur"
            ? "⚠ ڈیمو لنک — یہ کوئی حقیقی اخبار کا صفحہ نہیں۔"
            : "⚠ Demo link — not a real publisher page."}
        </span>
      </div>
    </section>
  );
}
