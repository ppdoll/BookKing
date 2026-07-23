import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getWrappedStats } from "@/lib/wrapped";
import { WrappedCard } from "@/components/WrappedCard";

const SITE_URL = "https://book-king-two.vercel.app";

async function loadCard(slug: string) {
  const card = await prisma.shareCard.findUnique({ where: { publicSlug: slug } });
  if (!card) return null;
  const stats = await getWrappedStats(card.userId, card.year);
  return stats;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stats = await loadCard(slug);
  if (!stats) return { title: "독서 결산 — BookKing" };

  const title = `${stats.name}님의 ${stats.year} 독서 결산 📚`;
  const parts = [`올해 ${stats.totalBooks}권 완독`];
  if (stats.totalBooks > 0) parts.push(`평균 별점 ${stats.avgStars}`);
  if (stats.fav) parts.push(`최애 «${stats.fav.title}»`);
  const description = parts.join(" · ");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/w/${slug}`,
      siteName: "BookKing",
      locale: "ko_KR",
      type: "website",
      images: [`${SITE_URL}/opengraph-image.png`],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicWrappedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stats = await loadCard(slug);
  if (!stats) notFound();

  return (
    <main className="container" style={{ maxWidth: 560 }}>
      <div style={{ textAlign: "center", margin: "8px 0 18px" }}>
        <Link href="/" className="logo" style={{ fontSize: 20, fontWeight: 900 }}>
          📚 Book<em style={{ fontStyle: "normal", color: "var(--accent)" }}>King</em>
        </Link>
      </div>

      <WrappedCard stats={stats} />

      <div style={{ textAlign: "center", marginTop: 22 }}>
        <p className="mini" style={{ margin: "0 0 10px" }}>
          나도 읽은 책을 기록하고 나만의 독서 결산을 만들어보세요 📖
        </p>
        <Link href="/" className="btn pri">BookKing 시작하기</Link>
      </div>
    </main>
  );
}
