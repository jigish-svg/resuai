export const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024; // 5MB — generous for any real resume/JD PDF/DOCX
export const MAX_PARSE_TEXT_LENGTH = 50_000; // characters — generous for any real resume/JD, caps cost/abuse from pasted text

export class UploadLimitError extends Error {}

export function assertFileWithinLimit(file: File): void {
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new UploadLimitError(`File is too large (max ${MAX_UPLOAD_FILE_BYTES / (1024 * 1024)}MB).`);
  }
}

export function assertTextWithinLimit(text: string): void {
  if (text.length > MAX_PARSE_TEXT_LENGTH) {
    throw new UploadLimitError(`Text is too long (max ${MAX_PARSE_TEXT_LENGTH.toLocaleString()} characters).`);
  }
}
