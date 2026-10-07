import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://neura-forge-gym.vercel.app';

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
