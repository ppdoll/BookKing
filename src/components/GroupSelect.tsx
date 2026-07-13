"use client";

import { selectGroup } from "@/lib/actions/user-actions";

export function GroupSelect({
  groups,
  currentId,
}: {
  groups: { id: string; name: string }[];
  currentId: string | null;
}) {
  if (groups.length === 0) return null;
  return (
    <form action={selectGroup}>
      <select
        className="input"
        name="groupId"
        defaultValue={currentId ?? undefined}
        aria-label="그룹 선택"
        style={{ width: "auto", padding: "4px 10px", borderRadius: 99, fontWeight: 700, fontSize: 13 }}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </form>
  );
}
