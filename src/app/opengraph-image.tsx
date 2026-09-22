import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'GetJobFit.ai — Evidence-Based Resume Tailoring';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#F5F3EC',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              background: '#0B6E4F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="52" height="52" viewBox="0 0 48 48">
              <path
                d="M13.5 20l6.8 7L33.6 14"
                fill="none"
                stroke="#ffffff"
                strokeWidth="4.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="33.6" cy="32" r="4" fill="#E5A910" />
            </svg>
          </div>
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, color: '#161d1e' }}>
            GetJobFit<span style={{ color: '#0B6E4F' }}>.ai</span>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: '#161d1e', maxWidth: 920 }}>
          Evidence-Based Resume Tailoring
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#4b544e', marginTop: 20, maxWidth: 880 }}>
          Match your resume to any job with real evidence, not fabrication. Truth Guard verified.
        </div>
      </div>
    ),
    { ...size }
  );
}
