"use client";

import { REGIONS, SUBJECTS, type RegionKey, type SubjectKey } from "@/lib/data";

type Lang = "en" | "ur";
interface TopicSelectorProps {
  selectedRegions: RegionKey[];
  selectedSubjects: SubjectKey[];
  onChange: (regions: RegionKey[], subjects: SubjectKey[]) => void;
  lang: Lang;
}

const REGION_UR: Record<RegionKey, string> = {
  Pakistan: "پاکستان", "South Asia": "جنوبی ایشیا", "East Asia": "مشرقی ایشیا",
  "Southeast Asia": "جنوب مشرقی ایشیا", "Middle East & North Africa": "مشرق وسطیٰ اور شمالی افریقہ",
  Europe: "یورپ", Africa: "افریقہ", "North America": "شمالی امریکہ",
  "Latin America": "لاطینی امریکہ", Oceania: "اوشینیا", Global: "عالمی",
};
const SUBJECT_UR: Record<SubjectKey, string> = {
  "Artificial Intelligence": "مصنوعی ذہانت", Technology: "ٹیکنالوجی",
  "Politics & Government": "سیاست اور حکومت", "Business & Economy": "کاروبار اور معیشت",
  Sports: "کھیل", Science: "سائنس", "Health & Medicine": "صحت اور طب",
  "Climate & Environment": "موسمیات اور ماحول", Education: "تعلیم",
  "Culture & Entertainment": "ثقافت اور تفریح",
};

function FilterGroup<T extends string>({ title, options, selected, labelFor, onToggle, lang }: {
  title: string; options: T[]; selected: T[]; labelFor: (value: T) => string;
  onToggle: (value: T) => void; lang: Lang;
}) {
  return <details className="subah-filter-group">
    <summary>{title}<span className="subah-filter-count">{selected.length || (lang === "ur" ? "سب" : "All")}</span></summary>
    <div className="subah-chips">
      {options.map((value) => <button key={value} type="button" onClick={() => onToggle(value)} aria-pressed={selected.includes(value)}
        className={`subah-chip${selected.includes(value) ? " subah-chip--active" : ""}`}>{labelFor(value)}</button>)}
    </div>
  </details>;
}

export default function TopicSelector({ selectedRegions, selectedSubjects, onChange, lang }: TopicSelectorProps) {
  const regionLabel = (value: RegionKey) => lang === "ur" ? REGION_UR[value] : value;
  const subjectLabel = (value: SubjectKey) => lang === "ur" ? SUBJECT_UR[value] : value;
  const toggleRegion = (region: RegionKey) => onChange(
    selectedRegions.includes(region) ? selectedRegions.filter((value) => value !== region) : [...selectedRegions, region], selectedSubjects,
  );
  const toggleSubject = (subject: SubjectKey) => onChange(
    selectedRegions, selectedSubjects.includes(subject) ? selectedSubjects.filter((value) => value !== subject) : [...selectedSubjects, subject],
  );
  const clear = () => onChange([], []);
  return <div className="subah-topic-selector">
    <div className="subah-section-label">{lang === "ur" ? "اپنی دلچسپیاں منتخب کریں" : "Choose your interests"}</div>
    <p className="subah-filter-help">{lang === "ur"
      ? "ایک گروپ کے اندر انتخاب میں سے کوئی ایک خبر سے میل کھا سکتا ہے؛ دونوں گروپس منتخب ہوں تو خبر کو دونوں سے میل کھانا ہوگا۔"
      : "Selections within a group use OR. When both groups have selections, an article must match a region AND a subject."}</p>
    <FilterGroup title={lang === "ur" ? "جغرافیہ" : "Geography"} options={REGIONS} selected={selectedRegions}
      labelFor={regionLabel} onToggle={toggleRegion} lang={lang} />
    <FilterGroup title={lang === "ur" ? "موضوعات" : "Subjects"} options={SUBJECTS} selected={selectedSubjects}
      labelFor={subjectLabel} onToggle={toggleSubject} lang={lang} />
    <div className="subah-filter-footer">
      <p className="subah-chip-summary">{selectedRegions.length + selectedSubjects.length === 0
        ? (lang === "ur" ? "تمام خبریں" : "All news")
        : `${lang === "ur" ? "علاقے" : "Regions"}: ${selectedRegions.map(regionLabel).join(" · ") || (lang === "ur" ? "سب" : "All")}  |  ${lang === "ur" ? "موضوعات" : "Subjects"}: ${selectedSubjects.map(subjectLabel).join(" · ") || (lang === "ur" ? "سب" : "All")}`}</p>
      {(selectedRegions.length > 0 || selectedSubjects.length > 0) && <button type="button" className="subah-btn subah-btn--outline" onClick={clear}>
        {lang === "ur" ? "تمام خبریں دکھائیں" : "Clear filters"}
      </button>}
    </div>
  </div>;
}
