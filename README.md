# 📚 BookKing — 함께 읽는 그룹 독서장

그룹원끼리 읽은 책을 기록하고, 별점·문장·느낀 점을 나누고, 랭킹을 겨루는 독서 기록 서비스.

- **스택**: Next.js 15 (App Router) · TypeScript · Prisma · Auth.js(Google 로그인) · 네이버 책 검색 API
- **DB**: Neon PostgreSQL (로컬·배포 공용)
- **배포**: Vercel
- 기능 명세는 [REQUIREMENTS.md](./REQUIREMENTS.md) 참고

## 로컬에서 실행하기

```bash
npm install
# .env 파일에 DATABASE_URL 등 입력 (.env.example 참고)
npx prisma db push   # DB 테이블 생성 (최초 1회)
npm run dev          # http://localhost:3000
```

- 로그인 화면의 **게스트 로그인**(개발용)은 `.env`의 `ALLOW_DEV_LOGIN="true"`일 때만 표시돼요
- **책정보 생성/네이버 검색**은 키가 없으면 안내 메시지가 나오고, 직접 입력으로 등록 가능

## API 키 발급 (무료)

### 1. Google 로그인
1. [Google Cloud Console](https://console.cloud.google.com) → 프로젝트 생성
2. **API 및 서비스 → OAuth 동의 화면** 설정 (외부, 앱 이름만 채워도 됨)
3. **사용자 인증 정보 → OAuth 클라이언트 ID** (웹 애플리케이션)
   - 승인된 리디렉션 URI에 추가:
     - 로컬: `http://localhost:3000/api/auth/callback/google`
     - 배포: `https://<도메인>/api/auth/callback/google`
4. 발급된 ID/Secret을 `.env`의 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`에 입력

### 2. 네이버 책 검색
1. [네이버 개발자센터](https://developers.naver.com) → 애플리케이션 등록
2. 사용 API에서 **검색** 선택 (일 25,000회 무료)
3. Client ID/Secret을 `.env`의 `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET`에 입력

## Vercel 배포

1. [vercel.com](https://vercel.com)에 **개인 GitHub 계정으로 가입** → Add New → Project → `BookKing` 리포 Import
2. Import 화면의 **Environment Variables**에 입력 (`.env.example` 참고):
   - `DATABASE_URL` — Neon 연결 문자열
   - `AUTH_SECRET` — 새 랜덤 값 (`npx auth secret`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET`
   - ⚠️ `ALLOW_DEV_LOGIN`은 설정하지 않기 (게스트 로그인 차단)
3. Deploy 클릭 — 이후 `git push`만 하면 자동 재배포
4. 배포 도메인 확인 후 **Google OAuth 리디렉션 URI 추가**:
   `https://<도메인>/api/auth/callback/google`

## 구조 한눈에 보기

```
src/
├─ auth.ts                  # Auth.js 설정 (Google + 개발용 게스트)
├─ app/
│  ├─ (auth)/login, welcome # 로그인 · 이름 등록
│  ├─ join/[code]           # 초대 링크 가입 (7일 만료)
│  ├─ (app)/                # 로그인 후 화면 (상단바 공통)
│  │  ├─ page.tsx           # 홈: 읽을예정/독서중/완독 보드 + 연간 차트 + 랭킹
│  │  ├─ books/new, [id]/edit, records/[id]
│  │  ├─ shelf, search, groups/new
│  │  └─ admin/posts, admin/group   # 운영자 글 관리 · 그룹장 관리
│  └─ api/naver-books       # 책정보 생성용 네이버 API 프록시
├─ lib/
│  ├─ actions/              # 서버 액션 (그룹·기록·유저)
│  ├─ rankings.ts           # 책 랭킹(3명+) · 독서왕 · 월별 차트
│  └─ naver.ts              # 네이버 책 검색
└─ components/              # 툰 디자인 UI 컴포넌트
```

## 권한 체계 (그룹별)

| 역할 | 권한 |
|---|---|
| 👑 그룹장 | 전체 + 운영자 지정/해제, 그룹장 위임, 초대 링크 재발급, 삭제 글 복구 |
| 🛡 운영자 | 사용자 + 글 관리(검색·수정·삭제 — soft delete) |
| 🙂 사용자 | 기록 등록/수정/삭제, 책장, 검색, 랭킹, 그룹 생성 |
