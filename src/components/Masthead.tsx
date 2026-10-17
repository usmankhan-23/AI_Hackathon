"use client";

type Lang = "en" | "ur";

interface MastheadProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  editionNow: string;
}

/**
 * Format today's date in the Asia/Karachi timezone.
 *
 * This is called only on the client (inside useEffect) to avoid a
 * Next.js "unstable value new Date()" error caused by the server
 * prerender timestamp differing from the client hydration timestamp.
 */
function formatTodayKarachi(editionNow: string, lang: Lang): string {
  const now = new Date(editionNow);
  const locale = lang === "ur" ? "ur-PK" : "en-US";
  return now.toLocaleDateString(locale, {
    timeZone: "Asia/Karachi",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const NAV_LINKS = [
  { id: "my-paper", en: "My Paper", ur: "میرا اخبار" },
  { id: "explore", en: "Explore", ur: "دریافت کریں" },
  { id: "ask-subah", en: "Ask Subah", ur: "سُبح سے پوچھیں" },
  { id: "archive", en: "Archive", ur: "آرکائیو" },
];

export default function Masthead({ lang, onLangChange, editionNow }: MastheadProps) {
  const dateLabel = formatTodayKarachi(editionNow, lang);

  return (
    <header className="subah-masthead" role="banner">
      {/* Top bar: date + language selector */}
      <div className="subah-masthead__top">
        <time
          className="subah-masthead__date"
          aria-label="Today's date"
          dateTime={editionNow}
          lang={lang === "ur" ? "ur" : "en"}
          dir={lang === "ur" ? "rtl" : "ltr"}
        >
          {dateLabel}
        </time>
        <div className="subah-lang-selector" role="group" aria-label="Language selector">
          <button
            className={`subah-lang-btn${lang === "en" ? " subah-lang-btn--active" : ""}`}
            onClick={() => onLangChange("en")}
            aria-pressed={lang === "en"}
            aria-label="Switch to English"
          >
            EN
          </button>
          <span className="subah-lang-divider" aria-hidden="true">|</span>
          <button
            className={`subah-lang-btn${lang === "ur" ? " subah-lang-btn--active" : ""}`}
            onClick={() => onLangChange("ur")}
            aria-pressed={lang === "ur"}
            aria-label="اردو میں دیکھیں"
          >
            اردو
          </button>
        </div>
      </div>

      {/* Nameplate */}
      <div className="subah-nameplate">
        <h1 className="subah-logo" lang="en" aria-label="Subah — Your Morning Newspaper">
          SUBAH
        </h1>
        <p className="subah-tagline">
          {lang === "ur"
            ? "آپ کی صبح۔ آپ کی دلچسپیاں۔ آپ کا اخبار۔"
            : "Your morning. Your interests. Your newspaper."}
        </p>
      </div>

      {/* Navigation */}
      <nav className="subah-nav" aria-label="Main navigation">
        {NAV_LINKS.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
          className="subah-nav__link"
          lang={lang}
          dir={lang === "ur" ? "rtl" : "ltr"}
            aria-label={link[lang]}
          >
            {link[lang]}
          </a>
        ))}
      </nav>
    </header>
  );
}
