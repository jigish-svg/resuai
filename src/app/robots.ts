import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

const APP_ROUTES = [
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
];

// Answer/citation crawlers for AI chat tools (ChatGPT, Perplexity, Claude, Copilot) —
// explicitly allowed so the marketing pages can be surfaced and cited in AI answers.
const ANSWER_ENGINE_BOTS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'BingPreview'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: APP_ROUTES },
      ...ANSWER_ENGINE_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: APP_ROUTES,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
