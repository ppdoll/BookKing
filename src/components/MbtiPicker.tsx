"use client";

import { useState } from "react";
import { MBTI_TYPES, MBTI_ALL } from "@/lib/constants";

/** MBTI 복수 선택 + "모두에게" — hidden input "mbti"에 CSV 저장 */
export function MbtiPicker({ defaultValue }: { defaultValue?: string | null }) {
  const initial = new Set(
    (defaultValue ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  );
  const [selected, setSelected] = useState<Set<string>>(initial);

  const toggle = (type: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (type === MBTI_ALL) {
        // "모두에게"는 단독 선택
        return next.has(MBTI_ALL) ? new Set<string>() : new Set([MBTI_ALL]);
      }
      next.delete(MBTI_ALL);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className="mbti">
      <button
        type="button"
        className={selected.has(MBTI_ALL) ? "sel" : ""}
        onClick={() => toggle(MBTI_ALL)}
      >
        💛 모두에게
      </button>
      {MBTI_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          className={selected.has(t) ? "sel" : ""}
          onClick={() => toggle(t)}
        >
          {t}
        </button>
      ))}
      <input type="hidden" name="mbti" value={[...selected].join(",")} />
    </div>
  );
}
