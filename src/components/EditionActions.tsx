"use client";

type Lang = "en" | "ur";

interface EditionActionsProps {
  lang: Lang;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function EditionActions({ lang, onRefresh, refreshing }: EditionActionsProps) {
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
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={lang === "ur" ? "خبریں تازہ کریں" : "Refresh news"}
        >
          <span aria-hidden="true">↻</span>
          {refreshing ? (lang === "ur" ? "تازہ ہو رہا ہے…" : "Refreshing…") : (lang === "ur" ? "تازہ کریں" : "Refresh")}
        </button>
      </div>
      <p className="subah-demo-note">
        {lang === "ur"
          ? "PDF اور آرکائیو کے کنٹرول ابھی ڈیمو ہیں۔"
          : "PDF download and archive controls are still demos."}
      </p>
    </aside>
  );
}
