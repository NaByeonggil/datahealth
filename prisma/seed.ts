import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const productTypes = [
    { code: "PT001", name: "정제", processingCost: 80, sortOrder: 1 },
    { code: "PT002", name: "경질캅셀", processingCost: 60, sortOrder: 2 },
    { code: "PT003", name: "연질캅셀", processingCost: 90, sortOrder: 3 },
    { code: "PT004", name: "분말스틱", processingCost: 100, sortOrder: 4 },
    { code: "PT005", name: "액상스틱", processingCost: 120, sortOrder: 5 },
    { code: "PT006", name: "파우치", processingCost: 130, sortOrder: 6 },
    { code: "PT007", name: "젤리", processingCost: 150, sortOrder: 7, isActive: false },
  ];

  for (const pt of productTypes) {
    await prisma.productType.upsert({
      where: { code: pt.code },
      update: pt,
      create: pt,
    });
  }

  const suppliers = [
    { code: "SUP001", name: "A제약", contact: "02-1234-5678", manager: "김원료" },
    { code: "SUP002", name: "B바이오", contact: "031-987-6543", manager: "이공급" },
    { code: "SUP003", name: "C원료", contact: "02-5555-1234", manager: "박소재" },
  ];

  for (const sup of suppliers) {
    await prisma.supplier.upsert({
      where: { code: sup.code },
      update: sup,
      create: sup,
    });
  }

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
