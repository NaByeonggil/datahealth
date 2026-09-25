/**
 * 원료명으로 마스터 연결 잇기.
 *
 * 수기로 친 원료명에는 materialId 가 없다. 이름이 정확히 일치하고 후보가 하나뿐일 때만
 * 이어 붙인다 — 동명이의 원료를 잘못 짚느니 연결 없이 두는 편이 낫다.
 *
 * 저장 시점에 이어두면 나중에 원료명이 바뀌어도 연결이 유지된다(이름 대조는 그때 끊긴다).
 */
import { prisma } from "@/lib/prisma";

interface Linkable {
  materialId: string | null;
  materialName: string;
}

export async function linkMaterialsByName<T extends Linkable>(items: T[]): Promise<T[]> {
  const names = [...new Set(items.filter((i) => !i.materialId).map((i) => i.materialName))];
  if (names.length === 0) return items;

  const found = await prisma.material.findMany({
    where: { name: { in: names }, isActive: true },
    select: { id: true, name: true },
  });

  const byName = new Map<string, string | null>();
  for (const m of found) {
    // 같은 이름이 둘 이상이면 어느 쪽인지 알 수 없으므로 연결하지 않는다
    byName.set(m.name, byName.has(m.name) ? null : m.id);
  }

  return items.map((i) =>
    i.materialId ? i : { ...i, materialId: byName.get(i.materialName) ?? null }
  );
}
