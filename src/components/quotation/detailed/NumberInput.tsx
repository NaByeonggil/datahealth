"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { num } from "@/lib/quotation/calculateDetailed";
import { cn } from "@/lib/utils";

/**
 * 숫자 입력. 포커스 중에는 사용자가 친 문자열을 그대로 유지하고("1." 같은 중간 입력),
 * 값은 즉시 숫자로 상위에 전달한다. 문자열이 DB 로 흘러가던 문제를 입력단에서 차단한다.
 */
export default function NumberInput({
  value,
  onValueChange,
  thousand = false,
  decimals = 0,
  readOnly = false,
  className,
  id,
  onKeyDown,
  placeholder,
}: {
  value: number;
  onValueChange?: (n: number) => void;
  /** 천단위 구분기호 표시 (금액) */
  thousand?: boolean;
  /** 표시 소수 자리수 (0 이면 입력값 그대로) */
  decimals?: number;
  readOnly?: boolean;
  className?: string;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const format = (v: number) => {
    if (!v) return "";
    const rounded = decimals > 0 ? Number(v.toFixed(decimals)) : v;
    return thousand ? rounded.toLocaleString("ko-KR") : String(rounded);
  };

  const [text, setText] = useState(() => format(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, thousand, decimals]);

  return (
    <Input
      id={id}
      className={cn("h-8 text-right", readOnly && "bg-muted text-muted-foreground", className)}
      type="text"
      inputMode="decimal"
      readOnly={readOnly}
      tabIndex={readOnly ? -1 : undefined}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true;
        if (thousand) setText(value ? String(value) : "");
        requestAnimationFrame(() => e.target.select());
      }}
      onBlur={() => {
        focused.current = false;
        setText(format(value));
      }}
      onChange={(e) => {
        if (readOnly) return;
        const raw = e.target.value;
        if (raw !== "" && !/^-?[0-9,]*\.?[0-9]*$/.test(raw)) return;
        setText(raw);
        onValueChange?.(num(raw));
      }}
      onKeyDown={onKeyDown}
    />
  );
}
