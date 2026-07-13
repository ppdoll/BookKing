import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchNaverBooks } from "@/lib/naver";

// 책 등록 화면의 [책정보 생성] 버튼이 호출
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ items: [], error: "로그인이 필요해요." }, { status: 401 });
  }
  const query = req.nextUrl.searchParams.get("query") ?? "";
  const result = await searchNaverBooks(query);
  return NextResponse.json(result);
}
