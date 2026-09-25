"use client";

import { useEffect, useState } from "react";

export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
}

/**
 * 현재 로그인 사용자 — 화면에서 원가 표시 여부를 가를 때 쓴다.
 * 어디까지나 표시용이다. 실제 차단은 proxy.ts 가 경로 단위로 건다.
 */
export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { if (alive) setUser(u); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  return user;
}
