"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";

interface FunctionCallCardProps {
  functionName: string;
  args?: string | null;
  result?: string | null;
}

const FUNCTION_LABELS: Record<string, string> = {
  search_raw_materials: "원료 검색",
  get_material_price: "원료 단가 조회",
  calculate_processing_cost: "가공비 계산",
  calculate_packaging_cost: "부자재비 계산",
  generate_quotation: "견적 생성",
};

export function FunctionCallCard({ functionName, args, result }: FunctionCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const label = FUNCTION_LABELS[functionName] ?? functionName;

  let parsedArgs = null;
  let parsedResult = null;
  try { parsedArgs = args ? JSON.parse(args) : null; } catch { /* ignore */ }
  try { parsedResult = result ? JSON.parse(result) : null; } catch { /* ignore */ }

  return (
    <div className="border rounded-lg bg-gray-50 text-sm my-1">
      <button
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg"
        onClick={() => setExpanded(!expanded)}
      >
        <Wrench className="h-3.5 w-3.5 text-blue-600 shrink-0" />
        <span className="font-medium text-blue-700">{label}</span>
        {parsedArgs && (
          <span className="text-xs text-muted-foreground truncate flex-1">
            {Object.entries(parsedArgs).map(([k, v]) => `${k}: ${v}`).join(", ")}
          </span>
        )}
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {parsedArgs && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">입력:</p>
              <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                {JSON.stringify(parsedArgs, null, 2)}
              </pre>
            </div>
          )}
          {parsedResult && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">결과:</p>
              <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-60 overflow-y-auto">
                {JSON.stringify(parsedResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
