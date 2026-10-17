"use client";

type Lang = "en" | "ur";

interface EditionActionsProps {
  lang: Lang;
}

export default function EditionActions({ lang }: EditionActionsProps) {
  const placeholder = (action: string) => {
    alert(
      lang === "ur"
        ? `${action} — یہ فیچر اگلے مرحلے میں شامل ہوگا۔`
        : `${action} — This feature will be available in a future stage.`
    );
  };

  return (
    <aside className="subah-edition-actions" aria-label="Edition controls">
      <h3 className="subah-edition-actions__title">
        {lang === "ur" ? "ایڈیشن" : "This Edition"}
      </h3>
      <div className="subah-edition-actions__btns">
        <button
          className="subah-btn subah-btn--outline"
          onClick={() =>
            placeholder(lang === "ur" ? "PDF ڈاؤن لوڈ" : "Download PDF")
          }
          aria-label={lang === "ur" ? "PDF ڈاؤن لوڈ کریں" : "Download newspaper PDF"}
        >
          <span aria-hidden="true">⬇</span>
          {lang === "ur" ? "PDF ڈاؤن لوڈ" : "Download PDF"}
        </button>
        <button
          className="subah-btn subah-btn--outline"
          onClick={() =>
            placeholder(lang === "ur" ? "پچھلے ایڈیشن" : "Previous editions")
          }
          aria-label={lang === "ur" ? "پچھلے ایڈیشن دیکھیں" : "View previous editions"}
        >
          <span aria-hidden="true">◷</span>
          {lang === "ur" ? "پچھلے ایڈیشن" : "Archive"}
        </button>
        <button
          className="subah-btn subah-btn--outline"
          onClick={() =>
            placeholder(lang === "ur" ? "ایڈیشن تازہ کریں" : "Refresh edition")
          }
          aria-label={lang === "ur" ? "ایڈیشن دوبارہ بنائیں" : "Refresh or regenerate edition"}
        >
          <span aria-hidden="true">↻</span>
          {lang === "ur" ? "تازہ کریں" : "Refresh"}
        </button>
      </div>
      <p className="subah-demo-note">
        {lang === "ur"
          ? "یہ کنٹرول ابھی ڈیمو حالت میں ہیں اور آئندہ مرحلے میں فعال ہوں گے۔"
          : "These controls are placeholders and will be activated in a future stage."}
      </p>
    </aside>
  );
}
