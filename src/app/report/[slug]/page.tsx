import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getClassroomProgress } from "@/lib/classroom-dashboard";
import { isExpired } from "@/lib/group-expiry";
import { nowInKst } from "@/lib/report";
import { ClassroomReport } from "@/components/ClassroomReport";
import { PrintButton } from "@/components/PrintButton";

/** 비밀 링크로만 열람 — 검색엔진 색인 금지 */
export const metadata: Metadata = {
  title: "학생 독서 현황 — BookKing",
  robots: { index: false, follow: false },
};

async function loadGroup(slug: string) {
  const group = await prisma.group.findUnique({
    where: { reportSlug: slug },
    select: { id: true, name: true, classroomMode: true, expiresAt: true },
  });
  if (!group || !group.classroomMode || isExpired(group)) return null;
  return group;
}

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await loadGroup(slug);
  if (!group) notFound();

  const data = await getClassroomProgress(group.id);

  return (
    <main className="container" style={{ maxWidth: 820 }}>
      <p className="fieldrow no-print" style={{ gap: 8, margin: "8px 0 14px" }}>
        <Link href="/" className="logo" style={{ fontSize: 18, fontWeight: 900 }}>
          📚 Book<em style={{ fontStyle: "normal", color: "var(--accent)" }}>King</em>
        </Link>
        <span style={{ flex: 1 }} />
        <PrintButton />
      </p>
      <div className="card print-plain">
        <ClassroomReport data={data} groupName={group.name} printedAt={nowInKst()} />
      </div>
      <p className="mini no-print" style={{ textAlign: "center", marginTop: 16 }}>
        이 페이지는 링크를 아는 사람만 볼 수 있어요. 선생님이 공유를 중지하면 열리지 않아요.
      </p>
    </main>
  );
}
