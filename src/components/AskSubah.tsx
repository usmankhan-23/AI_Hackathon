"use client";

import { useState } from "react";
import { DEMO_SUGGESTIONS } from "@/lib/data";

type Lang = "en" | "ur";

interface AskSubahProps {
  lang: Lang;
}

interface AskSource {
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
}

interface AskResponse {
  answer: string;
  sources: AskSource[];
}

export default function AskSubah({ lang }: AskSubahProps) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitQuestion = async (question: string) => {
    if (!question.trim() || submitting) return;
    setResponse(null);
    setError(null);
    setSubmitting(true);
    try {
      const result = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const payload = await result.json() as Partial<AskResponse> & { error?: string };
      if (!result.ok) throw new Error(payload.error || "Ask Subah could not answer right now. Please try again.");
      if (typeof payload.answer !== "string" || !Array.isArray(payload.sources)) {
        throw new Error("Ask Subah received an unexpected response. Please try again.");
      }
      setResponse({ answer: payload.answer, sources: payload.sources });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ask Subah could not answer right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitQuestion(query);
  };

  const handleSuggestion = (text: string) => {
    setQuery(text);
    setResponse(null);
    setError(null);
  };

  return (
    <section className="subah-ask" aria-label="Ask Subah" id="ask-subah">
      <div className="subah-ask__header">
        <span className="subah-ask__icon" aria-hidden="true">◈</span>
        <div>
          <h2 className="subah-ask__title">
            {lang === "ur" ? "سُبح سے سوال کریں" : "Ask Subah"}
          </h2>
          <p className="subah-ask__desc">
            {lang === "ur"
              ? "خبروں اور حالاتِ حاضرہ کے بارے میں سوال کریں۔ جواب تلاش کردہ ذرائع کے ساتھ دیا جائے گا۔"
              : "Ask about news and current affairs. Answers include links to supporting sources."}
          </p>
        </div>
      </div>

      <form className="subah-ask__form" onSubmit={handleSubmit}>
        <input
          id="ask-subah-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            lang === "ur" ? "اپنا سوال یہاں لکھیں…" : "Type your question here…"
          }
          className="subah-ask__input"
          aria-label={lang === "ur" ? "سوال ٹائپ کریں" : "Type your question"}
          dir={lang === "ur" ? "rtl" : "ltr"}
        />
        <button
          type="submit"
          className="subah-btn subah-btn--primary"
          disabled={submitting || !query.trim()}
          aria-label={lang === "ur" ? "سوال بھیجیں" : "Submit question"}
        >
          {submitting
            ? lang === "ur" ? "…" : "…"
            : lang === "ur" ? "پوچھیں" : "Ask"}
        </button>
      </form>

      <div className="subah-ask__suggestions">
        <span className="subah-section-label">
          {lang === "ur" ? "مثالی سوالات:" : "Example questions:"}
        </span>
        <div className="subah-ask__suggestion-list">
          {DEMO_SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              className="subah-suggestion-chip"
              onClick={() => handleSuggestion(s[lang])}
              type="button"
            >
              {s[lang]}
            </button>
          ))}
        </div>
      </div>

      {response && (
        <div className="subah-ask__response" role="status" aria-live="polite">
          <p dir="ltr" style={{ whiteSpace: "pre-wrap" }}>{response.answer}</p>
          {response.sources.length > 0 && (
            <div style={{ marginTop: "var(--space-md)" }}>
              <p className="subah-section-label">{lang === "ur" ? "ذرائع" : "Sources"}</p>
              <ol style={{ paddingLeft: "1.25rem", margin: "var(--space-xs) 0 0" }}>
                {response.sources.map((source, index) => (
                  <li key={`${source.url}-${index}`} style={{ marginBottom: "var(--space-xs)" }}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" dir="ltr">
                      [{index + 1}] {source.title}
                    </a>
                    <span dir="ltr"> — {source.publisher}{source.publishedAt ? ` · ${new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(new Date(source.publishedAt))}` : ""}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="subah-ask__response" role="alert" aria-live="assertive">
          <p>{error}</p>
          <button
            type="button"
            className="subah-btn subah-btn--primary"
            onClick={() => void submitQuestion(query)}
            disabled={submitting || !query.trim()}
            style={{ marginTop: "var(--space-sm)" }}
          >
            {lang === "ur" ? "دوبارہ کوشش کریں" : "Try again"}
          </button>
        </div>
      )}
    </section>
  );
}
