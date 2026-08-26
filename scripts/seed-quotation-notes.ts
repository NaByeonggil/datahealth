/**
 * 견적서 특기사항 기본 문구 시드 (1회성)
 *
 * 실제 발행 견적서(모두의모발 등)에 공통으로 들어가던 1~4번 문구다.
 * 이미 등록된 문구가 있으면 아무것도 하지 않으므로 여러 번 실행해도 안전하다.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const NOTES: { content: string; appliesTo: string }[] = [
  { content: "주원료 함량을 올리시거나 부원료를 추가하시면 단가가 올라갈 수 있습니다.", appliesTo: "ALL" },
  { content: "개략적인 견적서입니다. 성분표와 단박스 사양이 확정되어야 정확한 견적이 나올 수 있습니다.", appliesTo: "ALL" },
  // 분석비·신고비·심의비는 건강기능식품에만 발생한다
  { content: "기준규격분석비, 영양분석비, 품목제조신고비, 광고심의비, 동판비({동판비}) 별도입니다.(1회성)", appliesTo: "HEALTH_FOOD" },
  { content: "동판비({동판비}) 별도입니다.(1회성)", appliesTo: "NON_HEALTH_FOOD" },
  { content: "디자인비용 별도입니다.(1회성)", appliesTo: "ALL" },
];

async function main() {
  const existing = await prisma.quotationNoteTemplate.count();
  if (existing > 0) {
    console.log(`이미 ${existing}건 등록되어 있어 건너뜁니다.`);
    return;
  }
  for (const [i, n] of NOTES.entries()) {
    await prisma.quotationNoteTemplate.create({
      data: { content: n.content, appliesTo: n.appliesTo, sortOrder: i + 1, isActive: true },
    });
    console.log(`  ${i + 1}. [${n.appliesTo}] ${n.content}`);
  }
  console.log(`\n${NOTES.length}건 등록 완료`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
