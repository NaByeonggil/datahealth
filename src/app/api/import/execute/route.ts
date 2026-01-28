import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface MappingEntry { sourceIndex: number; targetField: string; }

const TARGET_MODELS: Record<string, {
  model: string;
  uniqueField: string;
  fields: string[];
}> = {
  material: { model: "material", uniqueField: "code", fields: ["code", "name", "category", "unit", "unitPrice", "origin", "specification", "note"] },
  supply: { model: "supply", uniqueField: "code", fields: ["code", "name", "unit", "unitPrice", "specification", "note"] },
  process: { model: "process", uniqueField: "code", fields: ["code", "name", "unitCost", "description"] },
  customer: { model: "customer", uniqueField: "code", fields: ["code", "name", "contact", "manager", "address", "email", "note"] },
  productType: { model: "productType", uniqueField: "code", fields: ["code", "name", "processingCost", "sortOrder", "description"] },
};

const NUMERIC_FIELDS = ["unitPrice", "unitCost", "processingCost", "sortOrder", "minOrderQty"];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fileBase64, fileName, fileType, sheetName, headerRow, dataStartRow, targetTable, mapping, options, templateId, supplierId } = body as {
    fileBase64: string; fileName: string; fileType: string; sheetName?: string;
    headerRow: number; dataStartRow: number; targetTable: string;
    mapping: MappingEntry[]; options: { duplicateHandling: string; emptyKeepExisting: boolean; newOnly: boolean };
    templateId?: string; supplierId?: string;
  };

  const config = TARGET_MODELS[targetTable];
  if (!config) return NextResponse.json({ error: "잘못된 대상 테이블" }, { status: 400 });

  // Parse file
  const buffer = Buffer.from(fileBase64, "base64");
  let allRows: string[][];

  if (fileType === "xlsx" || fileType === "xls") {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[sheetName || wb.SheetNames[0]];
    allRows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
  } else {
    const text = buffer.toString("utf-8");
    const result = Papa.parse(text, { header: false, skipEmptyLines: true });
    allRows = result.data as string[][];
  }

  const dataRows = allRows.slice(dataStartRow);
  const errors: { row: number; message: string }[] = [];
  const warnings: { row: number; message: string }[] = [];
  let successCount = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaModel = (prisma as any)[config.model];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = dataStartRow + i + 1;

    try {
      const record: Record<string, unknown> = {};
      for (const m of mapping) {
        if (m.sourceIndex < 0 || m.sourceIndex >= row.length) continue;
        const val = row[m.sourceIndex];
        if (val === undefined || val === null || String(val).trim() === "") {
          if (!options.emptyKeepExisting) record[m.targetField] = null;
          continue;
        }
        record[m.targetField] = NUMERIC_FIELDS.includes(m.targetField) ? Number(val) || 0 : String(val).trim();
      }

      if (!record.code || !record.name) {
        errors.push({ row: rowNum, message: "필수 필드(코드, 이름) 누락" });
        continue;
      }

      if (targetTable === "material" && supplierId) {
        record.supplierId = supplierId;
        if (!record.category) record.category = "주원료";
      }

      const existing = await prismaModel.findUnique({ where: { [config.uniqueField]: record[config.uniqueField] } });

      if (existing) {
        if (options.newOnly) { warnings.push({ row: rowNum, message: `이미 존재: ${record.code}` }); continue; }
        if (options.duplicateHandling === "skip") { warnings.push({ row: rowNum, message: `중복 건너뜀: ${record.code}` }); continue; }
        if (options.duplicateHandling === "error") { errors.push({ row: rowNum, message: `중복 오류: ${record.code}` }); continue; }
        // overwrite
        await prismaModel.update({ where: { id: existing.id }, data: record });
      } else {
        await prismaModel.create({ data: record });
      }
      successCount++;
    } catch (e) {
      errors.push({ row: rowNum, message: `처리 오류: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  const status = errors.length === 0 ? "success" : successCount > 0 ? "partial" : "failed";

  const history = await prisma.importHistory.create({
    data: {
      templateId: templateId || null,
      fileName,
      fileType,
      targetTable,
      totalRows: dataRows.length,
      successCount,
      errorCount: errors.length,
      warningCount: warnings.length,
      status,
      errorLog: JSON.stringify({ errors, warnings }),
      createdBy: "홍길동",
    },
  });

  return NextResponse.json({ id: history.id, status, totalRows: dataRows.length, successCount, errorCount: errors.length, warningCount: warnings.length, errors, warnings });
}
