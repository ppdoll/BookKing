import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { isExpired } from "@/lib/group-expiry";
import { SubmitButton } from "@/components/SubmitButton";
import { InAppBrowserGuard } from "@/components/InAppBrowserGuard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true, classroomMode: true, iconVersion: true },
  });
  if (!group || !group.classroomMode) return {};
  const title = `『${group.name}』 반 입장 — BookKing`;
  const description = "반번호와 비밀번호로 우리 반 독서장에 입장해요 📚";
  const images = group.iconVersion
    ? [{ url: `/api/group-icon/${group.id}?v=${group.iconVersion}`, width: 256, height: 256, alt: group.name }]
    : undefined;
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, ...(images ? { images } : {}) },
  };
}

export default async function ClassEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { code } = await params;
  const { error } = await searchParams;

  // 이미 로그인돼 있으면 홈으로
  const session = await auth();
  if (session?.user?.id) redirect("/");

  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    select: { name: true, classroomMode: true, joinPassword: true, expiresAt: true },
  });
  const expired = group ? isExpired(group) : false;

  return (
    <div className="center-page">
      <div className="logo" style={{ fontSize: 26, fontWeight: 900 }}>
        📚 Book<em style={{ fontStyle: "normal", color: "var(--accent)" }}>King</em>
      </div>
      <p className="mini" style={{ margin: "4px 0 20px" }}>우리 반 독서장</p>

      <InAppBrowserGuard />

      <div className="card">
        {!group || !group.classroomMode ? (
          <>
            <p style={{ margin: 0, fontWeight: 800 }}>😢 유효하지 않은 입장 링크예요</p>
            <p className="mini" style={{ margin: "6px 0 0" }}>선생님께 정확한 링크를 다시 받아주세요.</p>
          </>
        ) : expired ? (
          <>
            <p style={{ margin: 0, fontWeight: 800 }}>🗓 활동이 끝난 반이에요</p>
            <p className="mini" style={{ margin: "6px 0 0" }}>
              『{group.name}』은 만료일이 지나 기록이 모두 정리됐어요. 그동안 함께 읽어줘서 고마워요! 📚
            </p>
          </>
        ) : !group.joinPassword ? (
          <>
            <p style={{ margin: 0, fontWeight: 800 }}>🔒 아직 입장 준비 중이에요</p>
            <p className="mini" style={{ margin: "6px 0 0" }}>선생님이 비밀번호를 설정하면 입장할 수 있어요.</p>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 4px", fontSize: 15 }}>
              <b>『{group.name}』</b> 반에 입장해요 🏫
            </p>
            <p className="mini" style={{ margin: "0 0 14px" }}>
<b>별명</b>과 <b>내 비밀번호</b>로 들어와요.
            </p>
            {error === "name" && (
              <div className="toast err" style={{ marginBottom: 12 }}>별명이나 비밀번호가 맞지 않아요.</div>
            )}
            {error === "first" && (
              <div className="toast err" style={{ marginBottom: 12 }}>반번호나 반 비밀번호가 맞지 않아요.</div>
            )}

            {/* 이미 비밀번호를 정한 학생 — 별명 + 개인 비밀번호 */}
            <form
              action={async (formData: FormData) => {
                "use server";
                const nickname = String(formData.get("nickname") ?? "").trim();
                const password = String(formData.get("password") ?? "");
                try {
                  await signIn("classroom-name", { code, nickname, password, redirectTo: "/" });
                } catch (e) {
                  if (e instanceof AuthError) redirect(`/class/${code}?error=name`);
                  throw e;
                }
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <input className="input" name="nickname" placeholder="내 별명" required autoFocus />
                <input className="input" name="password" type="password" placeholder="내 비밀번호" required />
                <SubmitButton className="btn pri" pendingText="들어가는 중… 🎉">
                  <span style={{ width: "100%", textAlign: "center" }}>들어가기</span>
                </SubmitButton>
              </div>
            </form>

            {/* 처음이거나 비밀번호를 잊은 학생 — 반번호 + 반 비밀번호 */}
            <details style={{ marginTop: 16, borderTop: "2px dashed var(--soft-line)", paddingTop: 12 }}>
              <summary className="mini" style={{ cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>
                처음 들어오거나 비밀번호를 잊었어요
              </summary>
              <p className="mini" style={{ margin: "8px 0" }}>
                선생님이 알려준 <b>반번호</b>와 <b>반 비밀번호</b>로 들어오면, 내 비밀번호를 새로 정할 수 있어요.
              </p>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const classNo = String(formData.get("classNo") ?? "").trim();
                  const password = String(formData.get("password") ?? "");
                  try {
                    await signIn("classroom", { code, classNo, password, redirectTo: "/" });
                  } catch (e) {
                    if (e instanceof AuthError) redirect(`/class/${code}?error=first`);
                    throw e;
                  }
                }}
              >
                <div style={{ display: "grid", gap: 8 }}>
                  <input className="input" name="classNo" placeholder="반번호 (예: 15)" required />
                  <input className="input" name="password" type="password" placeholder="선생님이 알려준 반 비밀번호" required />
                  <SubmitButton className="btn" pendingText="확인 중…">
                    <span style={{ width: "100%", textAlign: "center" }}>반번호로 들어가기</span>
                  </SubmitButton>
                </div>
              </form>
            </details>
          </>
        )}
      </div>

      <p className="mini" style={{ marginTop: 14 }}>
        별명으로만 활동해요 · <Link href="/privacy" style={{ textDecoration: "underline" }}>개인정보 처리방침</Link>
      </p>
    </div>
  );
}
