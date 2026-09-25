"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { ROLES, ROLE_LABEL, ROLE_DESCRIPTION } from "@/lib/auth/roles";

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count?: { sessions: number };
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : "-";

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ username: "", name: "", role: "sales", password: "" });
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setUsers)
      .catch(() => toast.error("계정을 불러오지 못했습니다."));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: "", name: "", role: "sales", password: "" });
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({ username: u.username, name: u.name, role: u.role, password: "" });
    setDialogOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/users/${editing.id}` : "/api/users", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? { name: form.name, role: form.role, isActive: editing.isActive }
            : form
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "");
      toast.success(editing ? "수정했습니다." : "계정을 만들었습니다. 첫 로그인에서 비밀번호를 바꾸게 됩니다.");
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error((e as Error).message || "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u: UserRow) => {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: u.name, role: u.role, isActive: !u.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "");
      toast.success(u.isActive ? "계정을 중지했습니다. 열려 있던 로그인도 끊었습니다." : "계정을 다시 사용합니다.");
      fetchData();
    } catch (e) {
      toast.error((e as Error).message || "변경에 실패했습니다.");
    }
  };

  const doReset = async () => {
    if (!resetFor) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${resetFor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "");
      toast.success("비밀번호를 초기화했습니다. 해당 계정의 로그인은 모두 끊겼습니다.");
      setResetFor(null);
      setResetPassword("");
      fetchData();
    } catch (e) {
      toast.error((e as Error).message || "초기화에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "");
      toast.success("계정을 삭제했습니다.");
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      toast.error((e as Error).message || "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">사용자</h2>
          <p className="text-sm text-muted-foreground">
            역할에 따라 원가·마진 열람 범위가 달라집니다. 권한 표는 설정 &gt; 권한에서 볼 수 있습니다.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />계정 추가</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>계정 ({users.length}개)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>아이디</TableHead>
                <TableHead>이름</TableHead>
                <TableHead className="w-28">역할</TableHead>
                <TableHead className="w-24">상태</TableHead>
                <TableHead className="w-40">마지막 로그인</TableHead>
                <TableHead className="w-20 text-right">세션</TableHead>
                <TableHead className="w-40 text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    계정이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-sm">{u.username}</TableCell>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.mustChangePassword && (
                      <span className="ml-2 text-xs text-amber-700">비밀번호 변경 대기</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "outline"}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleActive(u)} title="눌러서 전환">
                      <Badge variant={u.isActive ? "default" : "secondary"}>
                        {u.isActive ? "사용" : "중지"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-sm">{fmtDate(u.lastLoginAt)}</TableCell>
                  <TableCell className="text-right text-sm">{u._count?.sessions ?? 0}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-1 justify-center">
                      <Button variant="outline" size="sm" title="수정" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" title="비밀번호 초기화"
                        onClick={() => { setResetFor(u); setResetPassword(""); }}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" title="삭제" onClick={() => setDeleteTarget(u)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "계정 수정" : "계정 추가"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "아이디는 바꿀 수 없습니다. 비밀번호는 초기화 버튼으로 다시 정해주세요."
                : "여기서 정한 비밀번호는 임시입니다. 본인이 첫 로그인에서 다시 정합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>아이디</Label>
              <Input value={form.username} disabled={Boolean(editing)}
                placeholder="영문 소문자·숫자 3~30자"
                onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <Label>이름</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>역할</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{ROLE_DESCRIPTION[form.role]}</p>
            </div>
            {!editing && (
              <div>
                <Label>임시 비밀번호</Label>
                <Input type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">8자 이상, 숫자로만 쓸 수 없습니다.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setDialogOpen(false)}>취소</Button>
            <Button disabled={busy} onClick={save}>{busy ? "저장 중..." : "저장"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetFor)} onOpenChange={(v) => !v && setResetFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>비밀번호 초기화</DialogTitle>
            <DialogDescription>
              {resetFor ? `${resetFor.name}(${resetFor.username}) 계정의 임시 비밀번호를 정합니다. ` : ""}
              이 계정의 열려 있는 로그인은 모두 끊기고, 본인이 다음 로그인에서 새로 정하게 됩니다.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>임시 비밀번호</Label>
            <Input type="password" value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setResetFor(null)}>취소</Button>
            <Button disabled={busy || !resetPassword} onClick={doReset}>
              {busy ? "처리 중..." : "초기화"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="계정을 삭제할까요?"
        description={deleteTarget
          ? `${deleteTarget.name}(${deleteTarget.username})\n되돌릴 수 없습니다. 잠시 막아두려면 삭제 대신 '중지'를 쓰세요.`
          : undefined}
        confirmLabel="삭제"
        destructive
        loading={busy}
        onConfirm={doDelete}
      />
    </div>
  );
}
