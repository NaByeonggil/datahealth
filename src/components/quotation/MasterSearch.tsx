"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";

export interface MasterOption {
  id: string;
  code?: string;
  name: string;
  unitPrice?: number;
  unitCost?: number;
  unit?: string | null;
  specification?: string | null;
  origin?: string | null;
}

/**
 * 마스터(원료/자재/공정) 공통 검색 입력.
 * 선택하면 마스터 id 와 단가가 함께 넘어와 견적 항목에 FK 로 저장된다.
 */
export default function MasterSearch({
  value,
  endpoint,
  priceField = "unitPrice",
  placeholder = "검색",
  inputId,
  onSelect,
  onManualChange,
  onKeyDown,
}: {
  value: string;
  endpoint: string;
  priceField?: "unitPrice" | "unitCost";
  placeholder?: string;
  inputId?: string;
  onSelect: (item: MasterOption) => void;
  onManualChange: (name: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<MasterOption[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updatePos = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 288) });
  };

  const handleSearch = (q: string) => {
    setQuery(q);
    onManualChange(q);
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    fetch(`${endpoint}?search=${encodeURIComponent(q)}&limit=10`)
      .then((r) => r.json())
      .then((res) => {
        const list: MasterOption[] = res.data || (Array.isArray(res) ? res : []);
        setResults(list.slice(0, 10));
        if (list.length > 0) {
          updatePos();
          setOpen(true);
        } else {
          setOpen(false);
        }
      })
      .catch(() => {});
  };

  const dropdown = open && (
    <div
      ref={listRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto"
    >
      {results.map((item) => (
        <button
          key={item.id}
          type="button"
          className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between gap-2"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
            setQuery(item.name);
            setOpen(false);
          }}
        >
          <span className="font-medium truncate">{item.name}</span>
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {(item[priceField] ?? 0).toLocaleString("ko-KR")}원 {item.origin || item.specification || ""}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative">
      <Input
        id={inputId}
        ref={inputRef}
        className="h-8"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => {
          if (results.length > 0) {
            updatePos();
            setOpen(true);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
      {typeof window !== "undefined" && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
