"use client";

import { useAiBoardStore } from "@/store/aiBoardStore";
import { Button } from "@/components/ui/button";
import { Activity, Pause } from "lucide-react";

export function BoardMonitorToggle() {
  const { monitorActive, startMonitor, stopMonitor } = useAiBoardStore();

  return (
    <Button
      size="sm"
      variant={monitorActive ? "destructive" : "default"}
      onClick={monitorActive ? stopMonitor : startMonitor}
    >
      {monitorActive ? (
        <>
          <Pause className="h-4 w-4 mr-1" />모니터링 중지
        </>
      ) : (
        <>
          <Activity className="h-4 w-4 mr-1" />자동 처리 시작
        </>
      )}
    </Button>
  );
}
