import type { jsPDF as JsPDF } from "jspdf";
import type { Article, RegionKey, SubjectKey } from "./data";
import { groupEditionArticles } from "./edition-archive";

export interface EditionPdfInput {
  editionDate: string;
  subjects: SubjectKey[];
  regions: RegionKey[];
  articles: Article[];
  leadArticleId: string | null;
}

export async function createEditionPdfDocument(edition: EditionPdfInput): Promise<JsPDF> {
  if (edition.articles.length === 0) throw new Error("There are no articles to export.");

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const bottom = pageHeight - margin - 10;
  let y = margin;

  const runningHeader = () => {
    pdf.setFont("times", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(90, 82, 66);
    pdf.text(`SUBAH  ·  ${edition.editionDate}`, margin, margin - 7);
    pdf.setDrawColor(138, 126, 104);
    pdf.line(margin, margin - 4, pageWidth - margin, margin - 4);
  };

  const addPage = () => {
    pdf.addPage();
    y = margin;
    runningHeader();
  };

  const ensureSpace = (height: number) => {
    if (y + height > bottom) addPage();
  };

  const addText = (
    value: string,
    options: { font?: "times" | "helvetica"; style?: "normal" | "bold" | "italic"; size: number; leading: number; color?: [number, number, number]; indent?: number; after?: number },
  ) => {
    const { font = "helvetica", style = "normal", size, leading, color = [40, 38, 32], indent = 0, after = 2 } = options;
    pdf.setFont(font, style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(value, contentWidth - indent) as string[];
    const height = Math.max(leading, lines.length * leading) + after;
    ensureSpace(height);
    pdf.text(lines, margin + indent, y);
    y += height;
    return lines;
  };

  pdf.setFont("times", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor(26, 23, 16);
  pdf.text("SUBAH", pageWidth / 2, y + 7, { align: "center" });
  y += 13;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(107, 100, 85);
  pdf.text(`YOUR MORNING NEWSPAPER  ·  ${edition.editionDate}`, pageWidth / 2, y, { align: "center" });
  y += 7;
  pdf.setDrawColor(26, 23, 16);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;
  if (edition.subjects.length || edition.regions.length) {
    addText(`Regions: ${edition.regions.join(" · ") || "All"}  |  Subjects: ${edition.subjects.join(" · ") || "All"}`, { size: 9, leading: 4.5, color: [107, 100, 85], after: 5 });
  } else {
    addText("All news", { size: 9, leading: 4.5, color: [107, 100, 85], after: 5 });
  }

  const addArticle = (article: Article, isLead = false) => {
    ensureSpace(isLead ? 31 : 24);
    if (isLead) {
      addText("LEAD STORY", { font: "helvetica", style: "bold", size: 8, leading: 4, color: [184, 154, 62], after: 2 });
    }
    addText(article.title, { font: "times", style: "bold", size: isLead ? 17 : 13, leading: isLead ? 7 : 5.5, after: 3 });
    addText(article.summary || "No publisher summary was provided.", { size: 9.5, leading: 4.5, color: [61, 58, 48], after: 3 });
    const published = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short",
    }).format(new Date(article.publishedAt));
    addText(`${article.sourceName}  ·  ${published}`, { size: 8.5, leading: 4, color: [107, 100, 85], after: 1 });
    const urlLines = addText(article.sourceUrl, { size: 8, leading: 3.7, color: [132, 103, 36], after: 4 });
    const linkHeight = Math.max(3.7, urlLines.length * 3.7);
    pdf.link(margin, y - linkHeight - 4, contentWidth, linkHeight, { url: article.sourceUrl });
    pdf.setDrawColor(214, 205, 184);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const lead = edition.articles.find((article) => article.id === edition.leadArticleId);
  if (lead) addArticle(lead, true);
  for (const section of groupEditionArticles(edition.articles, edition.leadArticleId)) {
    ensureSpace(11);
    addText(section.heading.toUpperCase(), { font: "helvetica", style: "bold", size: 9, leading: 4.5, color: [61, 58, 48], after: 3 });
    for (const article of section.articles) addArticle(article);
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(156, 146, 130);
    pdf.text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  return pdf;
}

export async function downloadEditionPdf(edition: EditionPdfInput): Promise<void> {
  const pdf = await createEditionPdfDocument(edition);
  pdf.save(`subah-edition-${edition.editionDate}.pdf`);
}
