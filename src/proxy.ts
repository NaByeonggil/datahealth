/**
 * 모든 요청의 관문 — 로그인 여부와 역할을 여기서 한 번에 막는다.
 * (Next 16 부터 middleware 대신 proxy 라는 이름을 쓴다)
 *
 * 화면에서 메뉴를 숨기는 건 권한이 아니다. API 를 직접 부르면 그만이라,
 * 실제 차단은 여기서 경로 단위로 건다.
 *
 * proxy 는 항상 node 런타임에서 돌아 Prisma 를 그대로 쓸 수 있다.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getUserByToken } from "@/lib/auth/session";
import {
  canViewCost, canEditMaster, canManageUsers, canAccessDetailedQuotation,
} from "@/lib/auth/roles";

export const config = {
  matcher: [
    // 정적 파일과 로그인 관련 경로는 그대로 통과시킨다
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

/** 로그인 없이 들어갈 수 있는 곳 */
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

/** 경로 앞부분 → 통과 조건. 위에서부터 먼저 걸리는 규칙을 쓴다. */
const RULES: { prefix: string; allow: (role: string) => boolean; label: string }[] = [
  // 계정·권한과 회사 설정은 관리자만
  { prefix: "/api/users", allow: canManageUsers, label: "계정 관리" },
  { prefix: "/settings/users", allow: canManageUsers, label: "계정 관리" },
  { prefix: "/settings/roles", allow: canManageUsers, label: "권한 관리" },
  { prefix: "/settings", allow: canManageUsers, label: "설정" },
  { prefix: "/api/settings/company", allow: canManageUsers, label: "회사 정보" },
  { prefix: "/api/settings/quotation-notes", allow: canViewCost, label: "견적서 문구" },

  // 상세견적서는 시트 자체가 원가표다
  { prefix: "/quotation/detailed", allow: canAccessDetailedQuotation, label: "상세견적서" },
  { prefix: "/api/quotation/detailed", allow: canAccessDetailedQuotation, label: "상세견적서" },

  // 일반견적서 작성·수정 화면은 원료 단가를 그대로 보여준다
  { prefix: "/quotation/simple/new", allow: canViewCost, label: "견적서 작성" },

  // 단가가 드러나는 마스터·임포트·AI
  { prefix: "/master", allow: canEditMaster, label: "마스터 관리" },
  { prefix: "/import", allow: canEditMaster, label: "임포트" },
  { prefix: "/ai", allow: canViewCost, label: "AI 어시스턴트" },
  { prefix: "/api/materials", allow: canViewCost, label: "원료 단가" },
  { prefix: "/api/material-catalog", allow: canViewCost, label: "취급품목" },
  { prefix: "/api/supplies", allow: canViewCost, label: "자재 단가" },
  { prefix: "/api/suppliers", allow: canEditMaster, label: "공급사" },
  { prefix: "/api/processes", allow: canViewCost, label: "공정비" },
  { prefix: "/api/processing-costs", allow: canViewCost, label: "가공비" },
  { prefix: "/api/tolling", allow: canViewCost, label: "임가공비" },
  { prefix: "/api/packaging", allow: canViewCost, label: "부자재" },
  { prefix: "/api/formulation-templates", allow: canViewCost, label: "배합 템플릿" },
  { prefix: "/api/import", allow: canEditMaster, label: "임포트" },
  { prefix: "/api/ai", allow: canViewCost, label: "AI 어시스턴트" },
  { prefix: "/api/customers", allow: canEditMaster, label: "고객사 마스터" },
  // /api/dashboard 는 건수와 공급가액만 다룬다(원가 아님). 권한 없는 화면에서
  // 튕겨 나오는 곳이 대시보드라 여기까지 막으면 갈 데가 없어진다 — 전원에게 연다.
];

/** 수정 화면은 /quotation/simple/<id>/edit 형태라 접두어로 못 잡는다 */
const SIMPLE_EDIT = /^\/quotation\/simple\/[^/]+\/edit$/;
/** 단가 변동 대조는 원가 정보다 */
const PRICE_CHECK = /^\/api\/quotation\/[^/]+\/[^/]+\/price-check$/;

function deny(req: NextRequest, label: string) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: `${label}에 접근할 권한이 없습니다.` },
      { status: 403 }
    );
  }
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = `?denied=${encodeURIComponent(label)}`;
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const user = await getUserByToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // 로그인 후 원래 가려던 곳으로 되돌려 보낸다
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // 비밀번호를 새로 정해야 하는 상태면 그 화면 밖으로 못 나간다
  if (user.mustChangePassword && pathname !== "/change-password" && !pathname.startsWith("/api/auth/")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "비밀번호를 먼저 변경해주세요." }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/change-password";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (SIMPLE_EDIT.test(pathname) && !canViewCost(user.role)) return deny(req, "견적서 수정");
  if (PRICE_CHECK.test(pathname) && !canViewCost(user.role)) return deny(req, "단가 변동 확인");

  const rule = RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (rule && !rule.allow(user.role)) return deny(req, rule.label);

  return NextResponse.next();
}
