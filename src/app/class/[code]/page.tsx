import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";
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
    select: { name: true, classroomMode: true },
  });
  if (!group || !group.classroomMode) return {};
  const title = `『${group.name}』 반 입장 — BookKing`;
  return { title, description: "반번호와 비밀번호로 우리 반 독서장에 입장해요 📚", robots: { index: false } };
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
    select: { name: true, classroomMode: true, joinPassword: true },
  });

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
              선생님이 나눠준 <b>반번호</b>와 <b>비밀번호</b>를 입력하세요.
            </p>
            {error && <div className="toast err" style={{ marginBottom: 12 }}>반번호나 비밀번호가 맞지 않아요.</div>}
            <form
              action={async (formData: FormData) => {
                "use server";
                const classNo = String(formData.get("classNo") ?? "").trim();
                const password = String(formData.get("password") ?? "");
                try {
                  await signIn("classroom", { code, classNo, password, redirectTo: "/" });
                } catch (e) {
                  if (e instanceof AuthError) {
                    redirect(`/class/${code}?error=1`);
                  }
                  throw e;
                }
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <input className="input" name="classNo" placeholder="반번호 (예: 15)" required />
                <input className="input" name="password" type="password" placeholder="비밀번호" required />
                <SubmitButton className="btn pri" pendingText="입장하는 중… 🎉">
                  <span style={{ width: "100%", textAlign: "center" }}>입장하기</span>
                </SubmitButton>
              </div>
            </form>
          </>
        )}
      </div>

      <p className="mini" style={{ marginTop: 14 }}>
        별명으로만 활동해요 · <Link href="/privacy" style={{ textDecoration: "underline" }}>개인정보 처리방침</Link>
      </p>
    </div>
  );
}
