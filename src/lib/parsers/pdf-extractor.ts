export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid issues with Next.js SSR
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  return data.text;
}
