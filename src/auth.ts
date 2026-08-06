import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { ROLE } from "@/lib/constants";

export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);
export const devLoginEnabled = process.env.ALLOW_DEV_LOGIN === "true";

const providers: Provider[] = [];

if (googleEnabled) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

// Google 키 없이 로컬에서 테스트하기 위한 게스트 로그인 (배포 시 ALLOW_DEV_LOGIN 제거)
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "게스트 로그인 (개발용)",
      credentials: { nickname: { label: "닉네임" } },
      async authorize(credentials) {
        const nickname = String(credentials?.nickname ?? "").trim();
        if (!nickname) return null;
        const email = `dev-${nickname.toLowerCase()}@dev.local`;
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({ data: { email, name: nickname } });
          const { ensurePersonalGroup } = await import("@/lib/personal-group");
          await ensurePersonalGroup(user.id, nickname);
        }
        return user;
      },
    })
  );
}

// 학교(교실) 모드 — 학생이 구글 계정 없이 "반번호 + 선생님이 알려주는 공용 비밀번호"로 입장.
// 그룹 설정(classroomMode)에 의존하므로 env 게이트 없이 항상 등록한다.
providers.push(
  Credentials({
    id: "classroom",
    name: "학교(반) 입장",
    credentials: {
      code: { label: "그룹 코드" },
      classNo: { label: "반번호" },
      password: { label: "비밀번호" },
    },
    async authorize(credentials) {
      const code = String(credentials?.code ?? "").trim();
      const classNo = String(credentials?.classNo ?? "").trim();
      const password = String(credentials?.password ?? "");
      if (!code || !classNo || !password) return null;

      const group = await prisma.group.findUnique({ where: { inviteCode: code } });
      if (!group || !group.classroomMode) return null;
      // 만료된 반은 입장 불가 (삭제 대기 중)
      if (group.expiresAt && group.expiresAt <= new Date()) return null;

      const { verifyPassword } = await import("@/lib/password");
      if (!verifyPassword(password, group.joinPassword)) return null;

      const entry = await prisma.classroomStudent.findUnique({
        where: { groupId_classNo: { groupId: group.id, classNo } },
      });
      if (!entry) return null;

      // 이미 배정된 반번호면 그 학생 계정으로 재로그인
      if (entry.claimedByUserId) {
        return prisma.user.findUnique({ where: { id: entry.claimedByUserId } });
      }

      // 첫 입장 — 가명 학생 계정 생성(별명만, 실명·이메일 없음) + 반 그룹 가입.
      // 개인 책장(ensurePersonalGroup)은 만들지 않음 — 학생은 반 그룹 안에만 존재.
      const user = await prisma.user.create({
        data: { name: entry.nickname, email: `class-${group.id}-${classNo}@bookking.local` },
      });
      await prisma.$transaction([
        prisma.classroomStudent.update({
          where: { id: entry.id },
          data: { claimedByUserId: user.id },
        }),
        prisma.groupMember.upsert({
          where: { userId_groupId: { userId: user.id, groupId: group.id } },
          update: {},
          create: { userId: user.id, groupId: group.id, role: ROLE.MEMBER },
        }),
      ]);
      return user;
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  events: {
    // Google 프로필 이름을 그대로 쓰지 않고, 서비스 표시 이름을 직접 등록받는다
    // (name이 비어 있으면 requireUser가 /welcome으로 보냄)
    async createUser({ user }) {
      if (user.id) {
        await prisma.user.update({ where: { id: user.id }, data: { name: null } });
      }
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
