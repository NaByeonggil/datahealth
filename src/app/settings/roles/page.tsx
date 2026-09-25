"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { ROLES, ROLE_LABEL, ROLE_DESCRIPTION, CAPABILITY_MATRIX } from "@/lib/auth/roles";

interface UserRow { id: string; name: string; username: string; role: string; isActive: boolean }

/**
 * 권한 안내 — 역할별로 무엇이 열리고 무엇이 막히는지 한 장으로 보여준다.
 * 표의 내용은 실제 차단에 쓰이는 함수(roles.ts)를 그대로 호출해 그리므로,
 * 코드와 안내가 어긋날 수 없다.
 */
export default function RolesPage() {
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">권한</h2>
        <p className="text-sm text-muted-foreground">
          역할은 세 가지로 고정되어 있습니다. 계정별 역할은 설정 &gt; 사용자에서 바꿉니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map((r) => {
          const members = users.filter((u) => u.role === r && u.isActive);
          return (
            <Card key={r}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant={r === "admin" ? "default" : "outline"}>{ROLE_LABEL[r]}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTION[r]}</p>
                <p className="text-xs mt-2">
                  현재 {members.length}명
                  {members.length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}· {members.map((m) => m.name).join(", ")}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>역할별 접근 범위</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>기능</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r} className="w-28 text-center">{ROLE_LABEL[r]}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {CAPABILITY_MATRIX.map((cap) => (
                <TableRow key={cap.label}>
                  <TableCell>
                    <span className="font-medium">{cap.label}</span>
                    {cap.detail && (
                      <span className="block text-xs text-muted-foreground">{cap.detail}</span>
                    )}
                  </TableCell>
                  {ROLES.map((r) => (
                    <TableCell key={r} className="text-center">
                      {cap.allow(r) ? (
                        <Check className="h-4 w-4 text-emerald-600 inline" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 inline" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            메뉴를 숨기는 것만으로는 권한이 아닙니다. 위 차단은 모든 요청이 지나는
            서버 관문(proxy)에서 경로 단위로 걸리므로, 주소를 직접 입력하거나 API를
            그대로 호출해도 막힙니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
