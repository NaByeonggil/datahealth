/** 화면에서 입력한 함유량 → 저장할 칸. 직접 입력한 행은 자동 추출이 덮어쓰지 않도록 isManual 로 남긴다 */
export function manualFields(body: Record<string, unknown>, specification: string | null) {
  const n = (v: unknown) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const amount = n(body.amount);
  return {
    component: s(body.component),
    amount,
    amountMax: n(body.amountMax),
    unit: s(body.unit),
    qualifier: s(body.qualifier),
    note: s(body.note),
    // 값이 있으면 함량 있음, 없으면 규격 유무로 "없음"의 이유를 구분한다
    status: amount != null ? "추출" : specification?.trim() ? "함량없음" : "규격없음",
    isManual: true,
  };
}
