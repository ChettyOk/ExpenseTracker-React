/**
 * Text extraction using Mozilla pdf.js (pdfjs-dist legacy build — required in Node.js;
 * the default build logs a warning and is not intended for server runtimes).
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { getDocument, VerbosityLevel } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(buffer.length);
  data.set(buffer);

  const loadingTask = getDocument({
    data,
    verbosity: VerbosityLevel.ERRORS,
  });

  const pdf = await loadingTask.promise;

  try {
    const parts: string[] = [];
    for (let p = 1; p <= pdf.numPages; p += 1) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();
      let lastY: number | undefined;
      let text = "";
      for (const item of textContent.items) {
        if (!("str" in item) || typeof item.str !== "string") continue;
        const y = item.transform[5] ?? 0;
        if (lastY === undefined || lastY === y) {
          text += item.str;
        } else {
          text += "\n" + item.str;
        }
        lastY = y;
      }
      parts.push(text);
    }
    return parts.join("\n\n");
  } finally {
    await pdf.destroy();
  }
}
