import { PDFExtract, type PDFExtractOptions } from 'pdf.js-extract';

const pdfExtract = new PDFExtract();

const extractBuffer = (
  buffer: Buffer,
  options: PDFExtractOptions = {},
): Promise<Awaited<ReturnType<PDFExtract['extract']>>> =>
  new Promise((resolve, reject) => {
    pdfExtract.extractBuffer(buffer, options, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });

export const extractPdfText = async (
  buffer: Buffer,
): Promise<string | null> => {
  try {
    const data = await extractBuffer(buffer, { normalizeWhitespace: true });
    const lines: string[] = [];

    for (const page of data.pages) {
      const pageLines = PDFExtract.utils.pageToLines(page, 5);
      const rows = PDFExtract.utils.extractTextRows(pageLines);

      for (const row of rows) {
        const line = row.join(' ').trim();
        if (line) {
          lines.push(line);
        }
      }
    }

    const text = lines.join('\n').trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
};
