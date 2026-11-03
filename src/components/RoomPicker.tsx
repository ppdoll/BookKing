import Link from "next/link";
import { roomId, sameRoom, type RoomKey, type RoomLayout } from "@/lib/class-no";

/** 학교 그룹에서 볼 범위 고르기 — 학교 전체, 또는 학년별 반 칩 */
export function RoomPicker({
  layout,
  room,
  href,
}: {
  layout: RoomLayout;
  /** 지금 보고 있는 반 — null이면 학교 전체 */
  room: RoomKey | null;
  href: (room: RoomKey | null) => string;
}) {
  return (
    <>
      <p className="mini" style={{ margin: 0, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ marginRight: 2 }}>보기</b>
        <Link href={href(null)} className={`fchip ${room ? "" : "on"}`}>🏫 학교 전체</Link>
      </p>
      {layout.grades.map((g) => (
        <p key={g} className="mini" style={{ margin: "8px 0 0", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <b style={{ minWidth: 40 }}>{g}학년</b>
          {layout.rooms
            .filter((r) => r.grade === g)
            .map((r) => (
              <Link key={roomId(r)} href={href(r)} className={`fchip ${sameRoom(r, room) ? "on" : ""}`}>
                {r.room}반
              </Link>
            ))}
        </p>
      ))}
    </>
  );
}
