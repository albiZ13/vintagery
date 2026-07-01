import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vintagery.it'

const AI_BOTS = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'Claude-Web', 'ClaudeBot', 'anthropic-ai',
  'Google-Extended', 'Googlebot-Extended', 'Gemini-User',
  'PerplexityBot', 'YouBot', 'Bytespider', 'CCBot',
  'Diffbot', 'Amazonbot', 'Applebot-Extended', 'cohere-ai',
  'meta-externalagent', 'FacebookBot', 'Omgilibot',
  'DataForSeoBot', 'PetalBot', 'TurnitinBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/auth/', '/dashboard/', '/impostazioni/', '/api/'],
      },
      ...AI_BOTS.map(userAgent => ({ userAgent, disallow: '/' })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
