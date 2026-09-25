// Upload types are decided from the file's bytes, never from its name or the
// browser-supplied MIME type (PRD 21). Stored content types come only from
// FILE_TYPES, so a renamed HTML file can never be served back as a page.

export type DetectedFileType = 'pdf' | 'docx' | 'png' | 'jpeg';

export const FILE_TYPES: Record<DetectedFileType, { mime: string; ext: string }> = {
  pdf: { mime: 'application/pdf', ext: 'pdf' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' },
  png: { mime: 'image/png', ext: 'png' },
  jpeg: { mime: 'image/jpeg', ext: 'jpg' },
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const ZIP_LOCAL_HEADER = [0x50, 0x4b, 0x03, 0x04];
// The PDF spec tolerates a little junk before the header; readers look in the first 1 KB.
const PDF_HEADER_WINDOW = 1024;

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const PDF_HEADER = ascii('%PDF-');
// ZIP entry names are stored uncompressed, so a Word file's parts are findable as bytes.
const DOCX_CONTENT_TYPES = ascii('[Content_Types].xml');
const DOCX_MAIN_PART = ascii('word/document.xml');

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  return bytes.length >= sig.length && sig.every((b, i) => bytes[i] === b);
}

function indexOf(bytes: Uint8Array, needle: number[], limit = bytes.length): number {
  const end = Math.min(limit, bytes.length) - needle.length;
  outer: for (let i = 0; i <= end; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export function detectFileType(bytes: Uint8Array): DetectedFileType | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return 'png';
  if (startsWith(bytes, JPEG_SIGNATURE)) return 'jpeg';
  if (indexOf(bytes, PDF_HEADER, PDF_HEADER_WINDOW) !== -1) return 'pdf';
  if (
    startsWith(bytes, ZIP_LOCAL_HEADER) &&
    indexOf(bytes, DOCX_CONTENT_TYPES) !== -1 &&
    indexOf(bytes, DOCX_MAIN_PART) !== -1
  ) {
    return 'docx';
  }
  return null;
}

const MAX_FILE_NAME = 150;

/** A display-only name: no path, no control or reserved characters. Never used in storage paths. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FILE_NAME);
  return cleaned || 'file';
}
