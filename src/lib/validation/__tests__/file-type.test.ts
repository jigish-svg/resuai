import { describe, expect, it } from 'vitest';
import { detectFileType, sanitizeFileName, FILE_TYPES } from '@/lib/validation/file-type';

const bytes = (...parts: (string | number[])[]) => {
  const chunks = parts.map((p) => (typeof p === 'string' ? new TextEncoder().encode(p) : Uint8Array.from(p)));
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
};

const ZIP_HEADER = [0x50, 0x4b, 0x03, 0x04];
const pdf = bytes('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');
const docx = bytes(ZIP_HEADER, '\u0014\u0000[Content_Types].xml ... ', ZIP_HEADER, 'word/document.xml ...');
const png = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'IHDR...');
const jpeg = bytes([0xff, 0xd8, 0xff, 0xe0], 'JFIF...');

describe('detectFileType', () => {
  it('detects each allowed type from its bytes', () => {
    expect(detectFileType(pdf)).toBe('pdf');
    expect(detectFileType(docx)).toBe('docx');
    expect(detectFileType(png)).toBe('png');
    expect(detectFileType(jpeg)).toBe('jpeg');
  });

  it('accepts a PDF with a short preamble before the header', () => {
    expect(detectFileType(bytes('\r\n\r\n', '%PDF-1.4 ...'))).toBe('pdf');
  });

  it('rejects a PDF header buried past the first kilobyte', () => {
    expect(detectFileType(bytes('x'.repeat(2000), '%PDF-1.4'))).toBeNull();
  });

  it('rejects HTML and scripts whatever the name says', () => {
    expect(detectFileType(bytes('<!doctype html><script>alert(1)</script>'))).toBeNull();
    expect(detectFileType(bytes('<svg onload="alert(1)"></svg>'))).toBeNull();
  });

  it('rejects ZIPs that are not Word documents', () => {
    expect(detectFileType(bytes(ZIP_HEADER, 'readme.txt'))).toBeNull();
    // An .xlsx has [Content_Types].xml but no word/ part.
    expect(detectFileType(bytes(ZIP_HEADER, '[Content_Types].xml', ZIP_HEADER, 'xl/workbook.xml'))).toBeNull();
    // Word part names without a ZIP header (e.g. a text file quoting them).
    expect(detectFileType(bytes('[Content_Types].xml word/document.xml'))).toBeNull();
  });

  it('returns null for empty and tiny inputs', () => {
    expect(detectFileType(new Uint8Array())).toBeNull();
    expect(detectFileType(bytes([0xff, 0xd8]))).toBeNull();
    expect(detectFileType(bytes('%PD'))).toBeNull();
  });

  it('maps every type to a fixed MIME type and extension', () => {
    expect(FILE_TYPES.pdf).toEqual({ mime: 'application/pdf', ext: 'pdf' });
    expect(FILE_TYPES.docx.ext).toBe('docx');
    expect(FILE_TYPES.png.mime).toBe('image/png');
    expect(FILE_TYPES.jpeg).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
  });
});

describe('sanitizeFileName', () => {
  it('drops path segments', () => {
    expect(sanitizeFileName('../../etc/passwd.pdf')).toBe('passwd.pdf');
    expect(sanitizeFileName('C:\\Users\\ana\\cert.png')).toBe('cert.png');
  });

  it('removes control and reserved characters', () => {
    expect(sanitizeFileName('a\u0000b\u001f.pdf')).toBe('ab.pdf');
    // "/" in a closing tag counts as a path separator, so only the tail survives.
    expect(sanitizeFileName('<script>alert(1)</script>.png')).toBe('script.png');
    expect(sanitizeFileName('<img src=x onerror=1>.png')).toBe('img src=x onerror=1.png');
    expect(sanitizeFileName('my:cert?*.pdf')).toBe('mycert.pdf');
  });

  it('keeps readable names, including accents and spaces', () => {
    expect(sanitizeFileName('Certificado   Ação  2024.pdf')).toBe('Certificado Ação 2024.pdf');
  });

  it('caps the length and falls back when nothing is left', () => {
    expect(sanitizeFileName('a'.repeat(300) + '.pdf').length).toBe(150);
    expect(sanitizeFileName('///')).toBe('file');
    expect(sanitizeFileName('')).toBe('file');
  });
});
