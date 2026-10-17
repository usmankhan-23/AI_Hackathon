"use client";

import { REGIONS, SUBJECTS, type RegionKey, type SubjectKey } from "@/lib/data";
import type { ReadingProfile as ReadingProfileValue } from "@/lib/reading-intelligence";
import { REGION_UR, SUBJECT_UR } from "@/components/TopicSelector";

type Lang = "en" | "ur";

export default function ReadingProfile({ profile, onChange, onReset, forYou, onForYouChange, storageError, lang }: {
  profile: ReadingProfileValue;
  onChange: (profile: ReadingProfileValue) => void;
  onReset: () => void;
  forYou: boolean;
  onForYouChange: (enabled: boolean) => void;
  storageError?: string | null;
  lang: Lang;
}) {
  const toggle = <T extends RegionKey | SubjectKey>(group: "regions" | "subjects", value: T) => {
    const selected = profile[group] as T[];
    const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
    onChange({ ...profile, [group]: next });
  };
  const labelRegion = (region: RegionKey) => lang === "ur" ? REGION_UR[region] : region;
  const labelSubject = (subject: SubjectKey) => lang === "ur" ? SUBJECT_UR[subject] : subject;

  return <section className="subah-reading-profile" aria-label={lang === "ur" ? "آپ کا مطالعے کا پروفائل" : "Your Reading Profile"}>
    <div className="subah-reading-profile__top">
      <div>
        <h3>{lang === "ur" ? "آپ کا مطالعے کا پروفائل" : "Your Reading Profile"}</h3>
        <p>{lang === "ur" ? "آپ کی محفوظ کردہ پسند صرف For You کی ترتیب میں استعمال ہوتی ہے۔" : "Saved separately from filters; used only to rank For You stories."}</p>
      </div>
      <button type="button" className={`subah-chip${forYou ? " subah-chip--active" : ""}`} aria-pressed={forYou} onClick={() => onForYouChange(!forYou)}>
        {lang === "ur" ? "آپ کے لیے" : "For You"}
      </button>
    </div>
    <p className="subah-filter-help">{lang === "ur" ? "موضوع اور علاقے سے میل کھانے والی خبریں اوپر آئیں گی؛ تمام خبریں دستیاب رہیں گی۔" : "Matching topics and regions rank higher. All filtered articles remain available."}</p>
    {storageError && <p className="subah-profile-error" role="status">{storageError}</p>}
    <details className="subah-filter-group">
      <summary>{lang === "ur" ? "پسندیدہ علاقے" : "Preferred regions"}<span className="subah-filter-count">{profile.regions.length || (lang === "ur" ? "کوئی نہیں" : "None")}</span></summary>
      <div className="subah-chips">{REGIONS.map((region) => <button key={region} type="button" className={`subah-chip${profile.regions.includes(region) ? " subah-chip--active" : ""}`} aria-pressed={profile.regions.includes(region)} onClick={() => toggle("regions", region)}>{labelRegion(region)}</button>)}</div>
    </details>
    <details className="subah-filter-group">
      <summary>{lang === "ur" ? "پسندیدہ موضوعات" : "Preferred topics"}<span className="subah-filter-count">{profile.subjects.length || (lang === "ur" ? "کوئی نہیں" : "None")}</span></summary>
      <div className="subah-chips">{SUBJECTS.map((subject) => <button key={subject} type="button" className={`subah-chip${profile.subjects.includes(subject) ? " subah-chip--active" : ""}`} aria-pressed={profile.subjects.includes(subject)} onClick={() => toggle("subjects", subject)}>{labelSubject(subject)}</button>)}</div>
    </details>
    {(profile.regions.length > 0 || profile.subjects.length > 0) && <button type="button" className="subah-btn subah-btn--outline" onClick={onReset}>{lang === "ur" ? "پروفائل صاف کریں" : "Reset profile"}</button>}
  </section>;
}
