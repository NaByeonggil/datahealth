import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import Papa from "papaparse";

const prisma = new PrismaClient();

async function main() {
  // Ensure a default supplier for this import
  let supplier = await prisma.supplier.findUnique({ where: { code: "SRC21" } });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { code: "SRC21", name: "source21 임포트", contact: null, manager: null, isActive: true },
    });
    console.log("기본 공급사 생성: SRC21");
  }

  // Also collect unique company names to create suppliers
  const csvText = fs.readFileSync("/Users/byeonggilna/Desktop/datahealth2/source21.csv", "utf-8");
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = result.data as Record<string, string>[];

  console.log(`총 ${rows.length}행 읽음`);

  // Collect unique companies and create suppliers
  const companySet = new Set<string>();
  for (const row of rows) {
    const company = (row.company || "").trim();
    if (company && company !== "") companySet.add(company);
  }

  const supplierMap: Record<string, string> = {}; // company name -> supplierId
  let supIdx = 100;
  for (const name of companySet) {
    const code = `SUP${String(supIdx++).padStart(3, "0")}`;
    let sup = await prisma.supplier.findFirst({ where: { name } });
    if (!sup) {
      sup = await prisma.supplier.create({ data: { code, name, isActive: true } });
    }
    supplierMap[name] = sup.id;
  }
  console.log(`공급사 ${companySet.size}개 처리`);

  let success = 0;
  let errors = 0;
  const errorLog: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawName = (row.rawData || "").trim();
    if (!rawName) { continue; }

    const code = `MAT-${String(i + 1).padStart(4, "0")}`;
    const priceStr = (row.kgPrice || "0").replace(/,/g, "").trim();
    const unitPrice = Number(priceStr) || 0;
    const company = (row.company || "").trim();
    const supplierId = company && supplierMap[company] ? supplierMap[company] : supplier.id;

    try {
      const existing = await prisma.material.findUnique({ where: { code } });
      if (existing) {
        await prisma.material.update({
          where: { id: existing.id },
          data: {
            name: rawName,
            specification: (row.contents || "").trim() || null,
            unitPrice,
            origin: (row.origin || "").trim() || null,
            note: (row.packing || "").trim() ? `포장: ${row.packing.trim()}kg` : null,
            supplierId,
            category: "주원료",
          },
        });
      } else {
        await prisma.material.create({
          data: {
            code,
            name: rawName,
            specification: (row.contents || "").trim() || null,
            unit: "kg",
            unitPrice,
            origin: (row.origin || "").trim() || null,
            note: (row.packing || "").trim() ? `포장: ${row.packing.trim()}kg` : null,
            supplierId,
            category: "주원료",
            isActive: true,
          },
        });
      }
      success++;
    } catch (e) {
      errors++;
      errorLog.push(`행 ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
    }

    if ((i + 1) % 500 === 0) console.log(`진행: ${i + 1}/${rows.length}`);
  }

  // Save import history
  await prisma.importHistory.create({
    data: {
      fileName: "source21.csv",
      fileType: "csv",
      targetTable: "material",
      totalRows: rows.length,
      successCount: success,
      errorCount: errors,
      warningCount: 0,
      status: errors === 0 ? "success" : success > 0 ? "partial" : "failed",
      errorLog: errorLog.length > 0 ? JSON.stringify(errorLog) : null,
      createdBy: "시스템",
    },
  });

  console.log(`\n완료: 성공 ${success}건 / 오류 ${errors}건 / 전체 ${rows.length}건`);
  if (errorLog.length > 0) {
    console.log("오류 목록 (최대 10건):");
    errorLog.slice(0, 10).forEach(e => console.log(`  - ${e}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
