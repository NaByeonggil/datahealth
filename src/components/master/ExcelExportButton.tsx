"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

/** 마스터 목록을 엑셀로 내려받는 버튼 — onExport 는 내보낸 건수를 돌려준다 */
export default function ExcelExportButton({ onExport }: { onExport: () => Promise<number> }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const count = await onExport();
      if (count === 0) toast.info("내보낼 데이터가 없습니다. (빈 파일이 저장되었습니다)");
      else toast.success(`${count.toLocaleString("ko-KR")}건을 엑셀로 내보냈습니다.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "엑셀 출력에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" onClick={run} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />}
      엑셀 출력
    </Button>
  );
}
