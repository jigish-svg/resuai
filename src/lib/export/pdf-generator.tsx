import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { ResumeDocument } from '@/types/export';
import { ResumeTemplate } from '@/types/resume';
import { formatDate } from '@/lib/utils';

const BRAND_GREEN = '#009B4D';

interface TemplateConfig {
  [key: string]: Style;
  page: Style;
  name: Style;
  contactRow: Style;
  sectionTitle: Style;
  summaryText: Style;
  expBlock: Style;
  expHeaderRow: Style;
  expTitle: Style;
  expDates: Style;
  expSubRow: Style;
  expCompany: Style;
  bulletRow: Style;
  bulletDot: Style;
  bulletText: Style;
  skillsText: Style;
  eduBlock: Style;
}

function buildConfig(template: ResumeTemplate): TemplateConfig {
  switch (template) {
    case 'modern':
      return {
        page: { paddingTop: 40, paddingBottom: 40, paddingHorizontal: 44, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
        name: { fontSize: 24, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: BRAND_GREEN },
        contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, fontSize: 9, color: '#444', marginBottom: 16 },
        sectionTitle: {
          fontSize: 11, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1,
          color: BRAND_GREEN, borderLeftWidth: 3, borderLeftColor: BRAND_GREEN, paddingLeft: 6,
          marginBottom: 8, marginTop: 14,
        },
        summaryText: { lineHeight: 1.5 },
        expBlock: { marginBottom: 10 },
        expHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
        expTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10.5 },
        expDates: { fontSize: 9, color: '#444' },
        expSubRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
        expCompany: { fontSize: 10, color: BRAND_GREEN },
        bulletRow: { flexDirection: 'row', marginBottom: 2, paddingLeft: 4 },
        bulletDot: { width: 10 },
        bulletText: { flex: 1, lineHeight: 1.4 },
        skillsText: { lineHeight: 1.6 },
        eduBlock: { marginBottom: 6 },
      };
    case 'minimal':
      return {
        page: { paddingTop: 40, paddingBottom: 40, paddingHorizontal: 44, fontSize: 10, fontFamily: 'Helvetica', color: '#000' },
        name: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
        contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, fontSize: 9, color: '#333', marginBottom: 14 },
        sectionTitle: {
          fontSize: 10.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1.5,
          marginBottom: 6, marginTop: 12,
        },
        summaryText: { lineHeight: 1.45 },
        expBlock: { marginBottom: 9 },
        expHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
        expTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10 },
        expDates: { fontSize: 9, color: '#333' },
        expSubRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
        expCompany: { fontSize: 9.5, color: '#000' },
        bulletRow: { flexDirection: 'row', marginBottom: 2, paddingLeft: 4 },
        bulletDot: { width: 10 },
        bulletText: { flex: 1, lineHeight: 1.35 },
        skillsText: { lineHeight: 1.5 },
        eduBlock: { marginBottom: 5 },
      };
    case 'compact':
      return {
        page: { paddingTop: 28, paddingBottom: 28, paddingHorizontal: 38, fontSize: 9, fontFamily: 'Helvetica', color: '#1a1a1a' },
        name: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
        contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, fontSize: 8, color: '#444', marginBottom: 10 },
        sectionTitle: {
          fontSize: 9.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.8,
          borderBottomWidth: 0.75, borderBottomColor: '#1a1a1a', paddingBottom: 2, marginBottom: 5, marginTop: 9,
        },
        summaryText: { lineHeight: 1.3, fontSize: 8.5 },
        expBlock: { marginBottom: 6 },
        expHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 0.5 },
        expTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
        expDates: { fontSize: 8, color: '#444' },
        expSubRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
        expCompany: { fontSize: 8.5, color: '#333' },
        bulletRow: { flexDirection: 'row', marginBottom: 1, paddingLeft: 3 },
        bulletDot: { width: 8, fontSize: 8.5 },
        bulletText: { flex: 1, lineHeight: 1.25, fontSize: 8.5 },
        skillsText: { lineHeight: 1.4, fontSize: 8.5 },
        eduBlock: { marginBottom: 4 },
      };
    case 'classic':
    default:
      return {
        page: { paddingTop: 40, paddingBottom: 40, paddingHorizontal: 44, fontSize: 10, fontFamily: 'Times-Roman', color: '#1a1a1a' },
        name: { fontSize: 22, fontFamily: 'Times-Bold', marginBottom: 4, textAlign: 'center' },
        contactRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, fontSize: 9, color: '#444', marginBottom: 16 },
        sectionTitle: {
          fontSize: 11, fontFamily: 'Times-Bold', textTransform: 'uppercase', letterSpacing: 1.5,
          textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingBottom: 3,
          marginBottom: 8, marginTop: 14,
        },
        summaryText: { lineHeight: 1.5 },
        expBlock: { marginBottom: 10 },
        expHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
        expTitle: { fontFamily: 'Times-Bold', fontSize: 10.5 },
        expDates: { fontSize: 9, color: '#444' },
        expSubRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
        expCompany: { fontSize: 10, color: '#333', fontFamily: 'Times-Italic' },
        bulletRow: { flexDirection: 'row', marginBottom: 2, paddingLeft: 4 },
        bulletDot: { width: 10 },
        bulletText: { flex: 1, lineHeight: 1.4 },
        skillsText: { lineHeight: 1.6 },
        eduBlock: { marginBottom: 6 },
      };
  }
}

function ResumePDF({ doc }: { doc: ResumeDocument }) {
  const styles = StyleSheet.create(buildConfig(doc.template ?? 'classic'));

  const contactParts = [
    doc.candidate.email,
    doc.candidate.phone,
    doc.candidate.location,
  ].filter(Boolean);

  return (
    <Document title={`${doc.candidate.name} — Resume`}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{doc.candidate.name}</Text>
        <View style={styles.contactRow}>
          {contactParts.map((part, i) => (
            <Text key={i}>{part}{i < contactParts.length - 1 ? '  •  ' : ''}</Text>
          ))}
          {doc.candidate.linkedin && (
            <Link src={doc.candidate.linkedin} style={{ color: '#444' }}>
              {doc.candidate.linkedin}
            </Link>
          )}
          {doc.candidate.website && (
            <Link src={doc.candidate.website} style={{ color: '#444' }}>
              {doc.candidate.website}
            </Link>
          )}
        </View>

        {doc.summary && (
          <View>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>{doc.summary}</Text>
          </View>
        )}

        {doc.experience.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {doc.experience.map((exp, i) => (
              <View key={i} style={styles.expBlock} wrap={false}>
                <View style={styles.expHeaderRow}>
                  <Text style={styles.expTitle}>{exp.job_title}</Text>
                  <Text style={styles.expDates}>
                    {formatDate(exp.start_date)} – {exp.is_current ? 'Present' : formatDate(exp.end_date || '')}
                  </Text>
                </View>
                <View style={styles.expSubRow}>
                  <Text style={styles.expCompany}>{exp.company}</Text>
                  {exp.location && <Text style={styles.expDates}>{exp.location}</Text>}
                </View>
                {exp.bullets.map((bullet, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {doc.skills.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.skillsText}>{doc.skills.join('  •  ')}</Text>
          </View>
        )}

        {doc.education.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {doc.education.map((edu, i) => (
              <View key={i} style={styles.eduBlock}>
                <View style={styles.expHeaderRow}>
                  <Text style={styles.expTitle}>
                    {edu.degree}{edu.field ? `, ${edu.field}` : ''}
                  </Text>
                  {edu.graduation_date && <Text style={styles.expDates}>{formatDate(edu.graduation_date)}</Text>}
                </View>
                <Text style={styles.expCompany}>
                  {edu.institution}{edu.gpa ? `  •  GPA: ${edu.gpa}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {doc.certifications.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {doc.certifications.map((cert, i) => (
              <View key={i} style={styles.expHeaderRow}>
                <Text>
                  {cert.name}{cert.issuer ? ` — ${cert.issuer}` : ''}
                </Text>
                {cert.date && <Text style={styles.expDates}>{formatDate(cert.date)}</Text>}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function generateResumePDF(doc: ResumeDocument): Promise<Buffer> {
  return renderToBuffer(<ResumePDF doc={doc} />);
}

export { ResumePDF };
