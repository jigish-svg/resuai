import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pdfParse = vi.fn();
const extractRawText = vi.fn();
vi.mock('pdf-parse', () => ({ default: pdfParse }));
vi.mock('mammoth', () => ({ extractRawText }));

const { extractDocumentText, UnsupportedFileError, ParseTimeoutError, MAX_PDF_PAGES, PARSE_TIMEOUT_MS } = await import(
  '@/lib/parsers/extract-text'
);
const { UploadLimitError } = await import('@/lib/validation/upload-limits');

const PDF = Buffer.from('%PDF-1.7\n...');
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('[Content_Types].xml word/document.xml')]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

beforeEach(() => {
  pdfParse.mockReset();
  extractRawText.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('extractDocumentText', () => {
  it('reads a PDF, asking pdf-parse to stop just past the page cap', async () => {
    pdfParse.mockResolvedValue({ text: 'resume text', numpages: 2 });
    await expect(extractDocumentText(PDF)).resolves.toBe('resume text');
    expect(pdfParse).toHaveBeenCalledWith(PDF, { max: MAX_PDF_PAGES + 1 });
  });

  it('reads a DOCX by content', async () => {
    extractRawText.mockResolvedValue({ value: 'docx text' });
    await expect(extractDocumentText(DOCX)).resolves.toBe('docx text');
    expect(pdfParse).not.toHaveBeenCalled();
  });

  it('rejects a PDF over the page cap', async () => {
    pdfParse.mockResolvedValue({ text: 'x', numpages: MAX_PDF_PAGES + 1 });
    await expect(extractDocumentText(PDF)).rejects.toBeInstanceOf(UploadLimitError);
  });

  it('accepts a PDF at exactly the page cap', async () => {
    pdfParse.mockResolvedValue({ text: 'x', numpages: MAX_PDF_PAGES });
    await expect(extractDocumentText(PDF)).resolves.toBe('x');
  });

  it('rejects images and HTML without calling a parser', async () => {
    await expect(extractDocumentText(PNG)).rejects.toBeInstanceOf(UnsupportedFileError);
    await expect(extractDocumentText(Buffer.from('<html><body>hi</body></html>'))).rejects.toBeInstanceOf(UnsupportedFileError);
    expect(pdfParse).not.toHaveBeenCalled();
    expect(extractRawText).not.toHaveBeenCalled();
  });

  it('gives up after the time limit', async () => {
    vi.useFakeTimers();
    pdfParse.mockReturnValue(new Promise(() => {}));
    const result = expect(extractDocumentText(PDF)).rejects.toBeInstanceOf(ParseTimeoutError);
    await vi.advanceTimersByTimeAsync(PARSE_TIMEOUT_MS + 1);
    await result;
  });
});
