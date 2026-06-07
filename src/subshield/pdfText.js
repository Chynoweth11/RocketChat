/**
 * PDF text extraction for SubShield, backed by Mozilla's pdf.js.
 *
 * This is the only browser-only, library-backed piece of the scanner. It turns
 * a real uploaded PDF into plain text, reconstructing line breaks from each
 * text fragment's position so the layout (ACORD rows, "INSURER A" lines) is
 * preserved for insuranceParser.js to read.
 *
 * It is imported solely by the lazily-loaded ScanModal, so pdf.js never lands
 * in the initial bundle - it downloads only when a user opens the uploader.
 */

// pdf.js is heavy, so it's loaded on demand the first time a PDF is parsed
// (rather than when the Scan modal's chunk loads). The worker runs parsing off
// the main thread.
let pdfjsPromise = null;
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjsLib = await import("pdfjs-dist");
      const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjsLib;
    })();
  }
  return pdfjsPromise;
}

// COIs and declaration pages are short; cap work so a huge PDF can't hang the UI.
const MAX_PAGES = 15;
const LINE_TOLERANCE = 3; // points of vertical drift treated as the same line

/**
 * Group a page's text fragments back into visual lines and return the page's
 * text, top-to-bottom and left-to-right.
 */
function itemsToText(items) {
  const lines = [];
  let current = null;

  const flush = () => {
    if (current) {
      lines.push(current);
      current = null;
    }
  };

  for (const item of items) {
    const str = item.str ?? "";
    if (!str.trim()) {
      if (item.hasEOL) flush();
      continue;
    }
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    if (!current || Math.abs(current.y - y) > LINE_TOLERANCE) {
      flush();
      current = { y, fragments: [{ x, str }] };
    } else {
      current.fragments.push({ x, str });
    }
    if (item.hasEOL) flush();
  }
  flush();

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) =>
      line.fragments
        .sort((a, b) => a.x - b.x)
        .map((fragment) => fragment.str)
        .join(" ")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}

/**
 * Extract text from a PDF.
 * @param {File|ArrayBuffer} source  An uploaded PDF File (preferred) or buffer.
 * @returns {Promise<{ text: string, pageCount: number, pages: string[] }>}
 */
export async function extractPdfText(source) {
  let data;
  try {
    data =
      source instanceof ArrayBuffer
        ? source
        : await source.arrayBuffer();
  } catch {
    throw new Error("Could not read the file. Please try a different PDF.");
  }

  let pdf;
  try {
    const pdfjsLib = await getPdfjs();
    pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
  } catch {
    throw new Error(
      "This file could not be read as a PDF. It may be password-protected, corrupted, or a scanned image."
    );
  }

  try {
    const total = Math.min(pdf.numPages, MAX_PAGES);
    const pages = [];
    for (let pageNum = 1; pageNum <= total; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      pages.push(itemsToText(content.items));
      page.cleanup?.();
    }
    const text = pages.join("\n").trim();
    return { text, pageCount: pdf.numPages, pages };
  } finally {
    pdf.destroy?.();
  }
}

/** Human-friendly file size in whole KB (used for the stored document record). */
export function fileSizeKb(file) {
  return Math.max(1, Math.round((file?.size || 0) / 1024));
}

/**
 * True when a PDF yielded essentially no extractable text - the hallmark of a
 * scanned/photographed document that would need OCR rather than text parsing.
 */
export function looksLikeScannedImage(text) {
  return (text || "").replace(/\s/g, "").length < 24;
}
