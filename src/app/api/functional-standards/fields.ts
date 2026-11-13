/** 공전 원료 기준표 입력값 정리 */
export function standardFields(body: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const list = (v: unknown) =>
    (str(v) ?? "").split(",").map((k) => k.trim()).filter(Boolean).join(",") || null;
  return {
    code: str(body.code),
    group: str(body.group) === "영양성분" ? "영양성분" : "기능성원료",
    name: str(body.name) ?? "",
    component: str(body.component),
    keywords: list(body.keywords) ?? "",
    excludes: list(body.excludes),
    note: str(body.note),
  };
}

export function duplicateError(error: unknown) {
  const e = error as { code?: string; meta?: { target?: string[] | string } };
  if (e.code !== "P2002") return null;
  return String(e.meta?.target ?? "").includes("code")
    ? "이미 같은 공전 번호가 있습니다." : "이미 같은 이름의 공전 원료가 있습니다.";
}
