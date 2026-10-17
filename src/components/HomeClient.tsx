"use client";

import { useState } from "react";
import Masthead from "@/components/Masthead";
import TopicSelector from "@/components/TopicSelector";
import LeadStory from "@/components/LeadStory";
import ArticleCard from "@/components/ArticleCard";
import AskSubah from "@/components/AskSubah";
import EditionActions from "@/components/EditionActions";
import {
  LEAD_STORY,
  LEAD_STORY_MATCH_REASON,
  SECTIONS,
  TopicKey,
} from "@/lib/data";

type Lang = "en" | "ur";

export default function HomeClient({ editionNow }: { editionNow: string }) {
  const [lang, setLang] = useState<Lang>("en");
  const [selectedTopics, setSelectedTopics] = useState<TopicKey[]>([
    "Artificial Intelligence",
    "Pakistan",
  ]);

  const isRtl = lang === "ur";

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
                {lang === "ur"
                  ? "اپنی پسندیدہ موضوعات منتخب کریں اور اپنا اخبار ذاتی بنائیں۔"
                  : "Select topics you care about to personalise your edition."}
              </p>
            </div>
            <TopicSelector
              selected={selectedTopics}
              onChange={setSelectedTopics}
              lang={lang}
            />
          </section>

          <div className="subah-rule" role="separator" />

          <LeadStory
            article={LEAD_STORY}
            matchReason={LEAD_STORY_MATCH_REASON}
            lang={lang}
            selectedTopics={selectedTopics}
          />

          <div className="subah-rule" role="separator" />

          {SECTIONS.map((section) => (
            <section
              key={section.id}
              className="subah-section"
              id={section.id}
              aria-label={section.label[lang]}
              lang={lang}
              dir={isRtl ? "rtl" : "ltr"}
            >
              <h2 className="subah-section__title subah-section__title--ruled">
                {section.label[lang]}
              </h2>
              <div className="subah-cards-grid">
                {section.articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    lang={lang}
                    selectedTopics={selectedTopics}
                    editionNow={editionNow}
                  />
                ))}
              </div>
            </section>
          ))}

          <div className="subah-rule" role="separator" />
          <AskSubah lang={lang} />
        </main>

        <aside className="subah-sidebar">
          <EditionActions lang={lang} />
        </aside>
      </div>

      <footer className="subah-footer" role="contentinfo">
        <p>
          <strong>SUBAH</strong>{" "}
          {lang === "ur"
            ? "— ہیکاتھون پروجیکٹ · صرف ڈیمو مقاصد کے لیے نمونہ مواد"
            : "— Hackathon Project · Stage 1 · Sample content for demonstration only"}
        </p>
      </footer>
    </div>
  );
}
