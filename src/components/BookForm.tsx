"use client";

import { useState } from "react";
import { createRecord, updateRecord } from "@/lib/actions/record-actions";
import { StarInput } from "@/components/StarInput";
import { MbtiPicker } from "@/components/MbtiPicker";
import { SubmitButton } from "@/components/SubmitButton";
import type { NaverBook } from "@/lib/naver";

export type BookFormInitial = {
  recordId?: string;
  title?: string;
  author?: string;
  publisher?: string;
  thumbnailUrl?: string;
  link?: string;
  price?: number | null;
  isbn?: string | null;
  status?: string;
  startDate?: string; // yyyy-mm-dd
  endDate?: string;
  stars?: number | null;
  mbti?: string | null;
  quote?: string | null;
  review?: string | null;
};

export function BookForm({
  mode,
  initial,
  groups = [],
  defaultGroupIds = [],
}: {
  mode: "create" | "edit";
  initial: BookFormInitial;
  /** 등록 가능한 그룹 목록 (create 모드에서 다중 선택) */
  groups?: { id: string; name: string }[];
  defaultGroupIds?: string[];
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [author, setAuthor] = useState(initial.author ?? "");
  const [publisher, setPublisher] = useState(initial.publisher ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initial.thumbnailUrl ?? "");
  const [link, setLink] = useState(initial.link ?? "");
  const [price, setPrice] = useState<number | null>(initial.price ?? null);
  const [isbn, setIsbn] = useState(initial.isbn ?? "");

  const [candidates, setCandidates] = useState<NaverBook[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function generateBookInfo() {
    if (!title.trim()) {
      setSearchError("먼저 책 제목을 입력해주세요.");
      setCandidates(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    setSearchNote(null);
    try {
      const params = new URLSearchParams({ title, author, publisher });
      const res = await fetch(`/api/naver-books?${params.toString()}`);
      const data = (await res.json()) as { items: NaverBook[]; error?: string; note?: string };
      if (data.error) setSearchError(data.error);
      if (data.note) setSearchNote(data.note);
      setCandidates(data.items);
    } catch {
      setSearchError("검색 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSearching(false);
    }
  }

  function pickCandidate(book: NaverBook) {
    setTitle(book.title);
    setAuthor(book.author);
    setPublisher(book.publisher);
    setThumbnailUrl(book.image);
    setLink(book.link);
    setPrice(book.price);
    setIsbn(book.isbn ?? "");
    setCandidates(null);
  }

  return (
    <form action={mode === "create" ? createRecord : updateRecord}>
      {initial.recordId && <input type="hidden" name="recordId" value={initial.recordId} />}
      <input type="hidden" name="thumbnailUrl" value={thumbnailUrl} />
      <input type="hidden" name="link" value={link} />
      <input type="hidden" name="price" value={price ?? ""} />
      <input type="hidden" name="isbn" value={isbn} />

      {mode === "create" && groups.length > 0 && (
        <>
          <label className="flabel">
            등록할 그룹 <span className="req">*</span> <span className="mini">(여러 개 선택 가능)</span>
          </label>
          <div className="fieldrow" style={{ gap: 6 }}>
            {groups.map((g) => (
              <label
                key={g.id}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700,
                  border: "2px solid var(--bd)", borderRadius: 99, padding: "4px 12px",
                  background: "var(--panel)", cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name="groupIds"
                  value={g.id}
                  defaultChecked={defaultGroupIds.includes(g.id)}
                  style={{ width: 15, height: 15 }}
                />
                {g.name}
              </label>
            ))}
          </div>
        </>
      )}

      <label className="flabel">
        상태 <span className="req">*</span>
      </label>
      <div className="statusradio">
        <label>
          <input type="radio" name="status" value="WISH" defaultChecked={(initial.status ?? "WISH") === "WISH"} />
          🌱 읽을 예정
        </label>
        <label>
          <input type="radio" name="status" value="READING" defaultChecked={initial.status === "READING"} />
          📖 독서중
        </label>
        <label>
          <input type="radio" name="status" value="DONE" defaultChecked={initial.status === "DONE"} />
          🏆 완독
        </label>
      </div>

      <label className="flabel">
        책 제목 <span className="req">*</span>
      </label>
      <input className="input" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 불편한 편의점" required />

      <label className="flabel">
        저자 <span className="req">*</span>
      </label>
      <div className="fieldrow">
        <input className="input" name="author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="예) 김호연" style={{ flex: 1, minWidth: 160 }} required />
        <input className="input" name="publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="출판사 (선택)" style={{ flex: 1, minWidth: 140 }} />
        <button type="button" className="btn pri" onClick={generateBookInfo} disabled={searching}>
          {searching ? "검색 중…" : "✨ 책정보 생성"}
        </button>
      </div>

      {(searchError || candidates) && (
        <div className="naver-pick">
          {searchError && <p className="mini" style={{ margin: "0 0 6px", color: "var(--danger)", fontWeight: 700 }}>{searchError}</p>}
          {searchNote && <p className="mini" style={{ margin: "0 0 6px", fontWeight: 700 }}>💡 {searchNote}</p>}
          {candidates && candidates.length === 0 && !searchError && (
            <p className="mini" style={{ margin: 0 }}>
              검색 결과가 없어요. 제목·저자의 띄어쓰기나 오타를 확인해보세요. 직접 입력한 내용으로 등록해도 괜찮아요.
            </p>
          )}
          {candidates && candidates.length > 0 && (
            <>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800 }}>네이버 책 검색 결과 — 등록할 책을 선택하세요</p>
              {candidates.map((b, i) => (
                <div className="pickrow" key={`${b.isbn ?? i}`}>
                  <span className="cover">{b.image ? <img src={b.image} alt="" /> : <span className="bk">📕</span>}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{b.title}</b>{" "}
                    <span className="mini">
                      {b.author} · {b.publisher}
                      {b.price ? ` · ${b.price.toLocaleString()}원` : ""}
                    </span>
                  </div>
                  <button type="button" className="btn sm pri" onClick={() => pickCandidate(b)}>선택</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {thumbnailUrl && (
        <div className="fieldrow" style={{ marginTop: 10 }}>
          <span className="cover" style={{ width: 48, height: 68 }}>
            <img src={thumbnailUrl} alt="책 표지" />
          </span>
          <span className="mini">
            표지·구매 링크·가격이 채워졌어요 {isbn ? `(ISBN ${isbn})` : ""}
            <br />
            <button type="button" className="btn sm" style={{ marginTop: 4 }} onClick={() => { setThumbnailUrl(""); setLink(""); setPrice(null); setIsbn(""); }}>
              책정보 지우기
            </button>
          </span>
        </div>
      )}

      <label className="flabel">독서 기간</label>
      <div className="fieldrow">
        <input className="input" type="date" name="startDate" defaultValue={initial.startDate ?? ""} style={{ width: "auto" }} aria-label="독서 시작일" />
        <span className="mini">~</span>
        <input className="input" type="date" name="endDate" defaultValue={initial.endDate ?? ""} style={{ width: "auto" }} aria-label="독서 완료일" />
        <span className="mini">홈의 [독서 시작!]/[다 읽었어요!] 버튼으로도 자동 입력돼요</span>
      </div>

      <label className="flabel">평가 <span className="mini">(완독 시 필수, 0.5 단위)</span></label>
      <StarInput defaultStars={initial.stars ?? null} />

      <label className="flabel">이런 사람에게 추천 <span className="mini">(MBTI, 복수 선택)</span></label>
      <MbtiPicker defaultValue={initial.mbti} />

      <label className="flabel">기억에 남는 문장</label>
      <textarea className="input" name="quote" defaultValue={initial.quote ?? ""} placeholder="마음에 남은 문장을 옮겨 적어보세요" />

      <label className="flabel">읽고 느낀 점</label>
      <textarea className="input" name="review" defaultValue={initial.review ?? ""} placeholder="읽고 나서 든 생각을 자유롭게 적어보세요" />

      <div className="fieldrow" style={{ marginTop: 18 }}>
        <SubmitButton className="btn pri" pendingText={mode === "create" ? "등록하는 중…" : "저장하는 중…"}>
          {mode === "create" ? "등록하기 🎉" : "수정 저장 ✅"}
        </SubmitButton>
      </div>
    </form>
  );
}
