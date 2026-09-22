import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/resume',
          '/jobs',
          '/match',
          '/tailor',
          '/jd-tailoring',
          '/cover-letter',
          '/interview-prep',
          '/mock-interview',
          '/account',
          '/api',
          '/auth',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
