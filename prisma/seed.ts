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

  // AI 프로바이더 설정
  const aiProviders = [
    {
      providerName: "llama_5060ti",
      displayName: "Llama (RTX 5060 Ti)",
      baseUrl: process.env.AI_LLAMA_5060TI_URL || "http://192.168.0.20:8080/v1",
      modelName: "llama-3-8b",
      priority: 1,
      description: "로컬 서버 (RTX 5060 Ti 16GB) - 주력 모델",
    },
    {
      providerName: "llama_780m",
      displayName: "Llama (780M)",
      baseUrl: process.env.AI_LLAMA_780M_URL || "http://192.168.0.10:8080/v1",
      modelName: "llama-3.2-3b",
      priority: 2,
      description: "로컬 서버 (780M 8GB) - 경량 모델 / 폴백",
    },
    {
      providerName: "openai",
      displayName: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY || "",
      modelName: "gpt-4o-mini",
      priority: 3,
      isActive: false,
      description: "OpenAI 외부 API - 폴백용",
    },
    {
      providerName: "claude",
      displayName: "Claude (Anthropic)",
      baseUrl: "https://api.anthropic.com/v1",
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      modelName: "claude-sonnet-4-5-20250929",
      priority: 4,
      isActive: false,
      description: "Anthropic Claude API - 폴백용",
    },
  ];

  for (const provider of aiProviders) {
    await prisma.aiSetting.upsert({
      where: { providerName: provider.providerName },
      update: {
        displayName: provider.displayName,
        baseUrl: provider.baseUrl,
        modelName: provider.modelName,
        priority: provider.priority,
        description: provider.description,
      },
      create: provider,
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
