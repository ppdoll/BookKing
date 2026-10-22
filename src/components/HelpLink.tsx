import Link from "next/link";
import { helpHref, type HelpId } from "@/lib/help";

/** 오류 안내 바로 밑에 붙이는 "어떻게 해야 하나요?" 링크 — 도움말의 해당 항목으로 바로 간다 */
export function HelpLink({ to, children = "🙋 어떻게 해야 하나요?" }: { to: HelpId; children?: React.ReactNode }) {
  return (
    <Link href={helpHref(to)} className="help-link">
      {children}
    </Link>
  );
}
