"use client";

import { useState } from "react";
import { DEMO_SUGGESTIONS, DEMO_AI_RESPONSE } from "@/lib/data";

type Lang = "en" | "ur";

interface AskSubahProps {
  lang: Lang;
}

export default function AskSubah({ lang }: AskSubahProps) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSubmitting(true);
    // Simulated delay for a demo interaction
    setTimeout(() => {
      setResponse(DEMO_AI_RESPONSE[lang]);
      setSubmitting(false);
    }, 800);
  };

  const handleSuggestion = (text: string) => {
    setQuery(text);
    setResponse(null);
  };

  return (
    <section className="subah-ask" aria-label="Ask Subah">
      <div className="subah-ask__header">
        <span className="subah-ask__icon" aria-hidden="true">◈</span>
        <div>
          <h2 className="subah-ask__title">
            {lang === "ur" ? "سُبح سے سوال کریں" : "Ask Subah"}
          </h2>
          <p className="subah-ask__desc">
            {lang === "ur"
              ? "اپنی خبروں کے بارے میں کچھ بھی پوچھیں — آگے چل کر AI سے جڑ جائے گا"
              : "Ask anything about your morning news — AI connection coming in a future stage"}
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
        <div className="subah-ask__response" role="alert" aria-live="polite">
          <p className="subah-demo-badge">
            {lang === "ur" ? "ڈیمو جواب" : "Demo Response"}
          </p>
          <p dir={lang === "ur" ? "rtl" : "ltr"}>{response}</p>
        </div>
      )}
    </section>
  );
}
