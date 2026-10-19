import { siteOrigin } from '@/lib/site-url';
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/member/login', '/signup', '/login/forgot-password'],
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
