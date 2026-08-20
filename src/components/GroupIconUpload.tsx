"use client";

import { useRef, useState, useTransition } from "react";
import { setGroupIcon, removeGroupIcon } from "@/lib/actions/group-actions";

const SIZE = 256; // 상단바·파비콘·OG를 한 장으로 커버하는 크기

/** 어떤 비율의 이미지든 가운데를 정사각형으로 잘라 256x256 PNG(data URL)로 변환 */
async function toSquarePng(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 사용 불가");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close?.();
  return canvas.toDataURL("image/png");
}

export function GroupIconUpload({ currentSrc }: { currentSrc: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onPick(file: File) {
    setError(null);
    try {
      const dataUrl = await toSquarePng(file);
      setPreview(dataUrl);
    } catch {
      setError("이 이미지는 읽을 수 없어요. PNG·JPG 파일로 다시 시도해주세요.");
    }
  }

  function save() {
    if (!preview) return;
    const fd = new FormData();
    fd.set("icon", preview);
    startTransition(() => setGroupIcon(fd));
  }

  const shown = preview ?? currentSrc;

  return (
    <div>
      <div className="fieldrow" style={{ gap: 12, alignItems: "center" }}>
        <span
          style={{
            width: 56, height: 56, flex: "none", borderRadius: 14,
            border: "2px solid var(--bd)", background: "var(--panel)",
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}
        >
          {shown ? (
            <img src={shown} alt="그룹 아이콘" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 22 }}>📚</span>
          )}
        </span>
        <div style={{ minWidth: 0 }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPick(f);
            }}
          />
          <span className="fieldrow" style={{ gap: 6 }}>
            <button type="button" className="btn sm" onClick={() => inputRef.current?.click()} disabled={pending}>
              🖼 이미지 고르기
            </button>
            {preview && (
              <button type="button" className="btn sm pri" onClick={save} disabled={pending}>
                {pending ? "저장 중…" : "저장"}
              </button>
            )}
            {!preview && currentSrc && (
              <button
                type="button"
                className="btn sm dngr"
                disabled={pending}
                onClick={() => startTransition(() => removeGroupIcon())}
              >
                {pending ? "삭제 중…" : "아이콘 삭제"}
              </button>
            )}
          </span>
          <p className="mini" style={{ margin: "6px 0 0" }}>
            정사각형으로 가운데가 잘리고 256×256으로 저장돼요. {preview && <b>미리보기 상태 — [저장]을 눌러야 적용돼요.</b>}
          </p>
        </div>
      </div>
      {error && <p className="mini" style={{ color: "var(--danger)", fontWeight: 700, margin: "8px 0 0" }}>{error}</p>}
    </div>
  );
}
