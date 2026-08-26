import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_COMPANY_INFO, CompanyInfoType } from "@/lib/company/supplier";

const ID = "default";

/** 1행이 없으면 기본값으로 만들어 준다 */
async function getOrCreate() {
  const found = await prisma.companyInfo.findUnique({ where: { id: ID } });
  if (found) return found;
  return prisma.companyInfo.create({ data: { id: ID, ...DEFAULT_COMPANY_INFO } });
}

export async function GET() {
  return NextResponse.json(await getOrCreate());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const keys: (keyof CompanyInfoType)[] = [
    "companyName", "ceo", "bizNo", "manager", "tel",
    "fax", "email", "address", "bizType", "bizItem",
  ];
  const data = Object.fromEntries(
    keys.map((k) => [k, typeof body[k] === "string" ? body[k].trim() : ""])
  );
  if (!data.companyName) {
    return NextResponse.json({ error: "상호는 필수입니다." }, { status: 400 });
  }
  await getOrCreate();
  const saved = await prisma.companyInfo.update({ where: { id: ID }, data });
  return NextResponse.json(saved);
}
