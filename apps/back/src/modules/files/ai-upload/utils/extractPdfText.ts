import type { PDFExtract, PDFExtractOptions } from 'pdf.js-extract';

type PdfExtractModule = {
  PDFExtract: typeof PDFExtract;
  instance: PDFExtract;
};

let pdfExtractModulePromise: Promise<PdfExtractModule> | null = null;

const getPdfExtractModule = (): Promise<PdfExtractModule> => {
  if (!pdfExtractModulePromise) {
    pdfExtractModulePromise = import('pdf.js-extract').then(
      ({ PDFExtract }) => ({
        PDFExtract,
        instance: new PDFExtract(),
      }),
    );
  }

  return pdfExtractModulePromise;
};

const extractBuffer = async (
  buffer: Buffer,
  options: PDFExtractOptions = {},
): Promise<Awaited<ReturnType<PDFExtract['extract']>>> => {
  const { instance } = await getPdfExtractModule();

  return new Promise((resolve, reject) => {
    instance.extractBuffer(buffer, options, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });
};

export const extractPdfText = async (
  buffer: Buffer,
): Promise<string | null> => {
  try {
    const { PDFExtract } = await getPdfExtractModule();
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
