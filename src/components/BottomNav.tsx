"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type MoreItem = {
  href: string;
  label: string;
  badge?: number;
  /** 새 탭으로 여는 외부 문서(도움말 등) */
  external?: boolean;
};

/** 하단 탭 — 가장 자주 쓰는 4개만. 나머지는 [더보기] 시트로 */
const TABS = [
  { href: "/", icon: "🏠", label: "홈" },
  { href: "/books/new", icon: "✏️", label: "책 등록" },
  { href: "/shelf", icon: "📖", label: "내 책장" },
  { href: "/search", icon: "🔍", label: "검색" },
];

/**
 * 모바일 전용 하단 탭바 + [더보기] 시트.
 * 화면이 좁을 때 상단바의 메뉴 줄바꿈(9개 링크가 3줄)을 대신한다.
 * 데스크톱에서는 .mnav가 CSS로 숨겨지고 기존 상단 메뉴가 그대로 쓰인다.
 */
export function BottomNav({
  items,
  userName,
  roleLabel,
  uuid,
  signOutSlot,
}: {
  items: MoreItem[];
  userName: string;
  roleLabel: string;
  uuid: string;
  /** 로그아웃 폼(서버 액션) — 서버 컴포넌트에서 그대로 넘겨받는다 */
  signOutSlot: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  // 시트 안의 링크를 눌러 화면이 바뀌면 자동으로 닫는다
  useEffect(() => {
    setOpen(false);
  }, [path]);

  // 시트가 열려 있는 동안 뒤 화면이 같이 스크롤되지 않게 + ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const badgeTotal = items.reduce((sum, it) => sum + (it.badge ?? 0), 0);

  return (
    <div className="mnav">
      <div
        className={`sheet-dim${open ? " show" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div className={`sheet${open ? " open" : ""}`} role="dialog" aria-label="전체 메뉴" aria-hidden={!open}>
        <div className="sheet-grab" />
        <p className="sheet-user">
          <b>{userName}</b> <span className="pill p-read">{roleLabel}</span>
          <span className="mini"> · UUID {uuid}</span>
        </p>
        <div className="sheet-grid">
          {items.map((it) =>
            it.external ? (
              <a key={it.href} href={it.href} target="_blank" rel="noreferrer" className="sheet-item" tabIndex={open ? 0 : -1}>
                {it.label}
              </a>
            ) : (
              <Link
                key={it.href}
                href={it.href}
                className={`sheet-item${active(it.href) ? " on" : ""}`}
                tabIndex={open ? 0 : -1}
              >
                {it.label}
                {it.badge ? <span className="sheet-badge num">{it.badge}</span> : null}
              </Link>
            )
          )}
        </div>
        <div className="sheet-foot">{signOutSlot}</div>
      </div>

      <nav className="tabbar" aria-label="주요 메뉴">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={active(t.href) && !open ? "on" : undefined}>
            <span className="ic" aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => setOpen((o) => !o)} className={open ? "on" : undefined} aria-expanded={open}>
          <span className="ic" aria-hidden="true">{open ? "✕" : "☰"}</span>
          <span>더보기</span>
          {badgeTotal > 0 && !open && <span className="tabdot num">{badgeTotal}</span>}
        </button>
      </nav>
    </div>
  );
}
