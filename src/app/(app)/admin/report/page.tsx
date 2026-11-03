import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, getCurrentMembership, isAdmin } from "@/lib/session";
import { getClassroomProgress, getSchoolView, scopeProgress } from "@/lib/classroom-dashboard";
import { getClassroomRankingData } from "@/lib/class-rankings";
import { roomId } from "@/lib/class-no";
import { nowInKst } from "@/lib/report";
import { ClassroomReport } from "@/components/ClassroomReport";
import { PrintButton } from "@/components/PrintButton";
import { RoomPicker } from "@/components/RoomPicker";

/** 선생님 전용 인쇄 보고서 — 공유하지 않고도 바로 인쇄·PDF 저장할 수 있다 */
export default async function AdminReportPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const user = await requireUser("/admin/report");
  const membership = await getCurrentMembership(user.id);
  if (!membership || !isAdmin(membership.role) || !membership.group.classroomMode) redirect("/");

  const year = new Date().getFullYear();
  // 반 구성(cache)을 명렬 집계와 함께 읽어두면 getSchoolView가 다시 묻지 않는다
  const [data] = await Promise.all([
    getClassroomProgress(membership.groupId),
    getClassroomRankingData(membership.groupId, year),
  ]);
  const school = await getSchoolView(membership.groupId, data.students, year, room);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <p className="fieldrow no-print" style={{ gap: 8, marginBottom: 14 }}>
        <Link href="/" className="btn sm">← 학생 현황으로</Link>
        <span style={{ flex: 1 }} />
        <PrintButton />
      </p>
      {school && (
        <div className="card no-print" style={{ marginBottom: 14 }}>
          <RoomPicker
            layout={school.layout}
            room={school.room}
            href={(r) => (r ? `/admin/report?room=${roomId(r)}` : "/admin/report")}
          />
        </div>
      )}
      <div className="card print-plain">
        <ClassroomReport
          data={scopeProgress(data, school?.room ?? null)}
          groupName={membership.group.name}
          printedAt={nowInKst()}
          school={school}
        />
      </div>
    </div>
  );
}
