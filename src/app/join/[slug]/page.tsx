import JoinGymClient from '@/components/join/JoinGymClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function JoinGymPage({ params }: PageProps) {
  const { slug } = await params;
  return <JoinGymClient slug={slug} />;
}
