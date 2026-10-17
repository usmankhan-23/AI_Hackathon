"use client";

import { ALL_TOPICS, TopicKey } from "@/lib/data";

type Lang = "en" | "ur";

interface TopicSelectorProps {
  selected: TopicKey[];
  onChange: (topics: TopicKey[]) => void;
  lang: Lang;
}

const TOPIC_LABELS: Record<TopicKey, { en: string; ur: string }> = {
  "Artificial Intelligence": { en: "Artificial Intelligence", ur: "مصنوعی ذہانت" },
  Technology: { en: "Technology", ur: "ٹیکنالوجی" },
  Pakistan: { en: "Pakistan", ur: "پاکستان" },
  World: { en: "World", ur: "دنیا" },
  Science: { en: "Science", ur: "سائنس" },
  Business: { en: "Business", ur: "کاروبار" },
  Sports: { en: "Sports", ur: "کھیل" },
};

export default function TopicSelector({ selected, onChange, lang }: TopicSelectorProps) {
  const toggle = (topic: TopicKey) => {
    onChange(
      selected.includes(topic)
        ? selected.filter((t) => t !== topic)
        : [...selected, topic]
    );
  };

  return (
    <div className="subah-topic-selector">
      <div className="subah-section-label">
        {lang === "ur" ? "اپنی دلچسپیاں منتخب کریں" : "Select Your Interests"}
      </div>
      <div className="subah-chips">
        {ALL_TOPICS.map((topic) => {
          const active = selected.includes(topic);
          return (
            <button
              key={topic}
              onClick={() => toggle(topic)}
              aria-pressed={active}
              className={`subah-chip${active ? " subah-chip--active" : ""}`}
            >
              {TOPIC_LABELS[topic][lang]}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="subah-chip-summary">
          {lang === "ur"
            ? `منتخب دلچسپیاں: ${selected.map((t) => TOPIC_LABELS[t].ur).join("، ")}`
            : `Following: ${selected.join(" · ")}`}
        </p>
      )}
    </div>
  );
}
