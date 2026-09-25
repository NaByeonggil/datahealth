import { prisma } from "@/lib/prisma";

/**
 * 견적번호 채번: DQ{YYMMDD}-{당일 일련번호 3자리}
 * 기존 랜덤 방식은 충돌 시 unique 제약 위반(500)이 났기 때문에 일련번호 방식으로 바꿨다.
 */
export async function nextDetailedQuotationNo(): Promise<string> {
  const now = new Date();
  const prefix = `DQ${now.getFullYear().toString().slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  const last = await prisma.detailedQuotation.findFirst({
    where: { quotationNo: { startsWith: prefix } },
    orderBy: { quotationNo: "desc" },
    select: { quotationNo: true },
  });

  const lastSeq = last ? Number(last.quotationNo.split("-")[1]) || 0 : 0;
  return `${prefix}-${String(lastSeq + 1).padStart(3, "0")}`;
}

/**
 * 일반견적번호 채번: SQ{YYMMDD}-{당일 일련번호 3자리}
 * 상세견적서와 같은 방식이다. 기존 랜덤 3자리는 하루 몇 건만 넘어가도 충돌 확률이 붙고
 * 복제 기능이 붙으면서 같은 날 대량 발행이 흔해져 일련번호로 바꿨다.
 */
export async function nextSimpleQuotationNo(): Promise<string> {
  const now = new Date();
  const prefix = `SQ${now.getFullYear().toString().slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  const last = await prisma.simpleQuotation.findFirst({
    where: { quotationNo: { startsWith: prefix } },
    orderBy: { quotationNo: "desc" },
    select: { quotationNo: true },
  });

  const lastSeq = last ? Number(last.quotationNo.split("-")[1]) || 0 : 0;
  return `${prefix}-${String(lastSeq + 1).padStart(3, "0")}`;
}
