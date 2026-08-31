import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
} from 'docx';
import { ResumeDocument } from '@/types/export';
import { formatDate } from '@/lib/utils';

const SECTION_BORDER = {
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '1A1A1A' },
};

function sectionHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    border: SECTION_BORDER,
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, color: '1A1A1A' })],
  });
}

export async function generateResumeDOCX(doc: ResumeDocument): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: doc.candidate.name, bold: true, size: 44 })],
      spacing: { after: 60 },
    })
  );

  const contactParts = [doc.candidate.email, doc.candidate.phone, doc.candidate.location]
    .filter(Boolean)
    .join('  •  ');
  const linkParts = [doc.candidate.linkedin, doc.candidate.website].filter(Boolean).join('  •  ');

  children.push(
    new Paragraph({
      children: [new TextRun({ text: [contactParts, linkParts].filter(Boolean).join('  •  '), size: 18, color: '444444' })],
      spacing: { after: 200 },
    })
  );

  if (doc.summary) {
    children.push(sectionHeading('Summary'));
    children.push(new Paragraph({ children: [new TextRun({ text: doc.summary, size: 20 })], spacing: { after: 100 } }));
  }

  if (doc.experience.length > 0) {
    children.push(sectionHeading('Experience'));
    for (const exp of doc.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120 },
          tabStops: [{ type: 'right', position: 9020 }],
          children: [
            new TextRun({ text: exp.job_title, bold: true, size: 21 }),
            new TextRun({
              text: `\t${formatDate(exp.start_date)} – ${exp.is_current ? 'Present' : formatDate(exp.end_date || '')}`,
              size: 18,
              color: '444444',
            }),
          ],
        })
      );
      children.push(
        new Paragraph({
          tabStops: [{ type: 'right', position: 9020 }],
          spacing: { after: 80 },
          children: [
            new TextRun({ text: exp.company, size: 20, color: '333333' }),
            ...(exp.location ? [new TextRun({ text: `\t${exp.location}`, size: 18, color: '444444' })] : []),
          ],
        })
      );
      for (const bullet of exp.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: bullet, size: 20 })],
          })
        );
      }
    }
  }

  if (doc.skills.length > 0) {
    children.push(sectionHeading('Skills'));
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: doc.skills.join('  •  '), size: 20 })],
      })
    );
  }

  if (doc.education.length > 0) {
    children.push(sectionHeading('Education'));
    for (const edu of doc.education) {
      children.push(
        new Paragraph({
          tabStops: [{ type: 'right', position: 9020 }],
          spacing: { before: 80 },
          children: [
            new TextRun({ text: `${edu.degree}${edu.field ? `, ${edu.field}` : ''}`, bold: true, size: 20 }),
            ...(edu.graduation_date
              ? [new TextRun({ text: `\t${formatDate(edu.graduation_date)}`, size: 18, color: '444444' })]
              : []),
          ],
        })
      );
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${edu.institution}${edu.gpa ? `  •  GPA: ${edu.gpa}` : ''}`, size: 19, color: '333333' }),
          ],
        })
      );
    }
  }

  if (doc.certifications.length > 0) {
    children.push(sectionHeading('Certifications'));
    for (const cert of doc.certifications) {
      children.push(
        new Paragraph({
          tabStops: [{ type: 'right', position: 9020 }],
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ''}`, size: 20 }),
            ...(cert.date ? [new TextRun({ text: `\t${formatDate(cert.date)}`, size: 18, color: '444444' })] : []),
          ],
        })
      );
    }
  }

  const document = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
