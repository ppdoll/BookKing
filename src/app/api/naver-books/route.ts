import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchNaverBooks, searchNaverBooksSmart } from "@/lib/naver";

// 책 등록 화면의 [책정보 생성] 버튼이 호출
// title/author/publisher를 따로 받아 단계적 검색 (오타에 강함)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ items: [], error: "로그인이 필요해요." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const title = sp.get("title") ?? "";

  if (title.trim()) {
    const result = await searchNaverBooksSmart({
      title,
      author: sp.get("author") ?? "",
      publisher: sp.get("publisher") ?? "",
    });
    return NextResponse.json(result);
  }

  // 하위 호환: 단일 query 파라미터
  const query = sp.get("query") ?? "";
  const result = await searchNaverBooks(query);
  return NextResponse.json(result);
}
