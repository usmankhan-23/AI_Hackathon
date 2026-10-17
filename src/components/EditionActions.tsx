"use client";

type Lang = "en" | "ur";

interface EditionActionsProps {
  lang: Lang;
  onDownloadPdf: () => void;
  pdfGenerating: boolean;
  pdfError: string | null;
  onOpenArchive: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function EditionActions({ lang, onDownloadPdf, pdfGenerating, pdfError, onOpenArchive, onRefresh, refreshing }: EditionActionsProps) {
  return (
    <aside className="subah-edition-actions" aria-label="Edition controls">
      <h3 className="subah-edition-actions__title">
        {lang === "ur" ? "ایڈیشن" : "This Edition"}
      </h3>
      <div className="subah-edition-actions__btns">
        <button
          className="subah-btn subah-btn--outline"
          onClick={onDownloadPdf}
          disabled={pdfGenerating}
          aria-label={lang === "ur" ? "PDF ڈاؤن لوڈ کریں" : "Download newspaper PDF"}
        >
          <span aria-hidden="true">⬇</span>
          {pdfGenerating ? (lang === "ur" ? "PDF تیار ہو رہی ہے…" : "Generating PDF…") : (lang === "ur" ? "PDF ڈاؤن لوڈ" : "Download PDF")}
        </button>
        <button
          className="subah-btn subah-btn--outline"
          onClick={onOpenArchive}
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
      {pdfError && <p className="subah-archive-message" role="alert">{pdfError}</p>}
      <p className="subah-demo-note">
        {lang === "ur"
          ? "پچھلے ایڈیشن صرف اسی براؤزر میں محفوظ ہیں۔"
          : "Previous editions are stored only in this browser."}
      </p>
    </aside>
  );
}
