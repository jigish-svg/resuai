import { detectFileType } from '@/lib/validation/file-type';
import { UploadLimitError } from '@/lib/validation/upload-limits';

export const MAX_PDF_PAGES = 20;
export const PARSE_TIMEOUT_MS = 15_000;

export class UnsupportedFileError extends Error {}
export class ParseTimeoutError extends Error {}

// This stops the request waiting, but cannot kill work pdf-parse has already
// started on this thread. A hard CPU/memory limit (PRD 21) needs a worker or a
// separate process.
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ParseTimeoutError('Document parsing timed out')), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  // Parsing one page past the cap is enough to know the file is too long.
  const data = await pdfParse(buffer, { max: MAX_PDF_PAGES + 1 });
  if (data.numpages > MAX_PDF_PAGES) {
    throw new UploadLimitError(`That file has more than ${MAX_PDF_PAGES} pages.`);
  }
  return data.text;
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/** Plain text from a resume or job document. The type is decided by content, never by name. */
export async function extractDocumentText(buffer: Buffer): Promise<string> {
  const type = detectFileType(buffer);
  if (type === 'pdf') return withTimeout(extractPdf(buffer), PARSE_TIMEOUT_MS);
  if (type === 'docx') return withTimeout(extractDocx(buffer), PARSE_TIMEOUT_MS);
  throw new UnsupportedFileError('Only PDF and Word documents can be read');
}
