"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";

export interface MaterialOption {
  id: string;
  code: string;
  name: string;
  unitPrice: number;
  origin: string | null;
  specification?: string | null;
}

function formatNumber(num: number): string {
  return num.toLocaleString("ko-KR");
}

export default function MaterialSearch({
  value,
  onSelect,
  onManualChange,
}: {
  value: string;
  onSelect: (mat: MaterialOption) => void;
  onManualChange: (name: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<MaterialOption[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onManualChangeRef = useRef(onManualChange);
  onManualChangeRef.current = onManualChange;

  const updatePos = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 288) });
    }
  };

  const handleSearch = (q: string) => {
    setQuery(q);
    onManualChangeRef.current(q);
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    fetch(`/api/materials?search=${encodeURIComponent(q)}&limit=10`)
      .then((r) => r.json())
      .then((res) => {
        const list = res.data || (Array.isArray(res) ? res : []);
        setResults(list);
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
      ref={ref}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto"
    >
      {results.map((m) => (
        <button
          key={m.id}
          type="button"
          className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(m);
            setQuery(m.name);
            setOpen(false);
          }}
        >
          <span className="font-medium">{m.name}</span>
          <span className="text-muted-foreground text-xs">
            {formatNumber(m.unitPrice)}원 {m.origin || ""}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative">
      <Input
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
        onBlur={() => {
          setTimeout(() => setOpen(false), 200);
        }}
        placeholder="원료명 검색"
      />
      {typeof window !== "undefined" && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
