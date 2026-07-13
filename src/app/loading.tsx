/** 페이지 전환 중 즉시 표시되는 로딩 화면 (스트리밍) */
export default function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div
        className="card"
        style={{ padding: "18px 28px", fontWeight: 800, fontSize: 15, display: "flex", gap: 10, alignItems: "center" }}
      >
        <span style={{ fontSize: 22 }}>📚</span> 책장을 펼치는 중…
      </div>
    </div>
  );
}
