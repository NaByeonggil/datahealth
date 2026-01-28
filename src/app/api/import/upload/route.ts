import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase();

  try {
    if (ext === "xlsx" || ext === "xls") {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheets = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        return { name, rowCount: data.length, headers: (data[0] || []) as string[], preview: data.slice(0, 11) };
      });
      return NextResponse.json({ fileType: "xlsx", fileName: file.name, sheets });
    }

    if (ext === "csv" || ext === "tsv") {
      const text = buffer.toString("utf-8");
      const result = Papa.parse(text, { header: false, skipEmptyLines: true });
      const rows = result.data as string[][];
      return NextResponse.json({
        fileType: "csv",
        fileName: file.name,
        sheets: [{ name: "Sheet1", rowCount: rows.length, headers: rows[0] || [], preview: rows.slice(0, 11) }],
      });
    }

    return NextResponse.json({ error: "지원하지 않는 파일 형식입니다. (xlsx, xls, csv, tsv)" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "파일 파싱에 실패했습니다." }, { status: 500 });
  }
}
