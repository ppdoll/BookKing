import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, getCurrentMembership, isAdmin } from "@/lib/session";
import { getClassroomProgress } from "@/lib/classroom-dashboard";
import { nowInKst } from "@/lib/report";
import { ClassroomReport } from "@/components/ClassroomReport";
import { PrintButton } from "@/components/PrintButton";

/** 선생님 전용 인쇄 보고서 — 공유하지 않고도 바로 인쇄·PDF 저장할 수 있다 */
export default async function AdminReportPage() {
  const user = await requireUser("/admin/report");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isAdmin(membership.role) || !membership.group.classroomMode) redirect("/");

  const data = await getClassroomProgress(membership.groupId, { includePrivate: true });

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <p className="fieldrow no-print" style={{ gap: 8, marginBottom: 14 }}>
        <Link href="/" className="btn sm">← 학생 현황으로</Link>
        <span style={{ flex: 1 }} />
        <PrintButton />
      </p>
      <div className="card print-plain">
        <ClassroomReport data={data} groupName={membership.group.name} printedAt={nowInKst()} />
      </div>
    </div>
  );
}
