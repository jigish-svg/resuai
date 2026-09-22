import { ImageResponse } from 'next/og';

export const size = { width: 48, height: 48 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B6E4F',
          borderRadius: 11,
        }}
      >
        <svg width="30" height="30" viewBox="0 0 48 48">
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
    ),
    { ...size }
  );
}
