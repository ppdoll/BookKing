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
        className="input gsel"
        name="groupId"
        defaultValue={currentId ?? undefined}
        aria-label="그룹 선택"
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
