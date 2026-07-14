import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

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
