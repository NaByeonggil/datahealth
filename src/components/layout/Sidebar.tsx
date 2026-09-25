"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Package,
  Download,
  Settings,
  ChevronDown,
  ChevronRight,
  Factory,
  FlaskConical,
  Truck,
  DollarSign,
  Tags,
  Box,
  Cog,
  Users,
  Shield,
  Building2,
  FileSpreadsheet,
  Link2,
  History,
  PanelLeftClose,
  PanelLeft,
  Bot,
  MessageSquare,
  ClipboardList,
  BarChart3,
  Wrench,
  BookOpen,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  canViewCost, canEditMaster, canManageUsers, canAccessDetailedQuotation, ROLE_LABEL,
} from "@/lib/auth/roles";
import { toast } from "sonner";

interface MenuItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  /** 이 역할만 메뉴에 보인다. 비우면 전원. 차단 자체는 proxy.ts 가 한다. */
  allow?: (role: string) => boolean;
}

export interface SidebarUser {
  id: string;
  username: string;
  name: string;
  role: string;
}

const menuItems: MenuItem[] = [
  {
    label: "대시보드",
    href: "/",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "견적서",
    icon: <FileText className="h-4 w-4" />,
    children: [
      { label: "일반견적서", href: "/quotation/simple/new", icon: <FileText className="h-4 w-4" />, allow: canViewCost },
      { label: "상세견적서", href: "/quotation/detailed/new", icon: <FileSpreadsheet className="h-4 w-4" />, allow: canAccessDetailedQuotation },
      { label: "전체목록", href: "/quotation", icon: <FileText className="h-4 w-4" /> },
    ],
  },
  {
    label: "마스터관리",
    allow: canEditMaster,
    icon: <Package className="h-4 w-4" />,
    children: [
      { label: "제품유형", href: "/master/product-type", icon: <Tags className="h-4 w-4" /> },
      { label: "가공비", href: "/master/processing-cost", icon: <DollarSign className="h-4 w-4" /> },
      { label: "임가공비 단가", href: "/master/tolling-rate", icon: <DollarSign className="h-4 w-4" /> },
      { label: "추가 공정비", href: "/master/tolling-extra", icon: <Cog className="h-4 w-4" /> },
      { label: "부자재 세트", href: "/master/packaging-set", icon: <Box className="h-4 w-4" /> },
      { label: "원료", href: "/master/material", icon: <FlaskConical className="h-4 w-4" /> },
      { label: "배합 템플릿", href: "/master/formulation-template", icon: <BookOpen className="h-4 w-4" /> },
      { label: "공급사", href: "/master/supplier", icon: <Truck className="h-4 w-4" /> },
      { label: "자재", href: "/master/supply", icon: <Box className="h-4 w-4" /> },
      { label: "공정", href: "/master/process", icon: <Cog className="h-4 w-4" /> },
      { label: "고객사", href: "/master/customer", icon: <Factory className="h-4 w-4" /> },
    ],
  },
  {
    label: "AI 어시스턴트",
    allow: canViewCost,
    icon: <Bot className="h-4 w-4" />,
    children: [
      { label: "AI 견적 채팅", href: "/ai/chat", icon: <MessageSquare className="h-4 w-4" /> },
      { label: "문의 게시판", href: "/ai/board", icon: <ClipboardList className="h-4 w-4" /> },
      { label: "AI 대시보드", href: "/ai/dashboard", icon: <BarChart3 className="h-4 w-4" /> },
      { label: "AI 설정", href: "/ai/settings", icon: <Wrench className="h-4 w-4" /> },
    ],
  },
  {
    label: "임포트센터",
    allow: canEditMaster,
    icon: <Download className="h-4 w-4" />,
    children: [
      { label: "파일 임포트", href: "/import", icon: <Download className="h-4 w-4" /> },
      { label: "매핑 템플릿", href: "/import/template", icon: <Link2 className="h-4 w-4" /> },
      { label: "임포트 이력", href: "/import/history", icon: <History className="h-4 w-4" /> },
    ],
  },
  {
    label: "설정",
    allow: canManageUsers,
    icon: <Settings className="h-4 w-4" />,
    children: [
      { label: "사용자", href: "/settings/users", icon: <Users className="h-4 w-4" /> },
      { label: "권한", href: "/settings/roles", icon: <Shield className="h-4 w-4" /> },
      { label: "회사", href: "/settings/company", icon: <Building2 className="h-4 w-4" /> },
      { label: "견적서 문구", href: "/settings/quotation-notes", icon: <FileText className="h-4 w-4" /> },
    ],
  },
];

export default function Sidebar({ user, children }: { user: SidebarUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["견적서", "마스터관리"]);

  /** 권한 없는 메뉴는 아예 보여주지 않는다 (실제 차단은 proxy.ts) */
  const visibleMenu = menuItems
    .filter((item) => !item.allow || item.allow(user.role))
    .map((item) => ({
      ...item,
      children: item.children?.filter((c) => !c.allow || c.allow(user.role)),
    }))
    .filter((item) => item.href || (item.children && item.children.length > 0));

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      toast.error("로그아웃에 실패했습니다.");
    }
  };

  const toggleSection = (label: string) => {
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r bg-white transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <Factory className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">헬씨팜바이오</span>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-gray-100 rounded">
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-3.5rem)]">
          {visibleMenu.map((item) => (
            <div key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {item.icon}
                  {!collapsed && item.label}
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => toggleSection(item.label)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {item.icon}
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {openSections.includes(item.label) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </>
                    )}
                  </button>
                  {!collapsed && openSections.includes(item.label) && item.children && (
                    <div className="ml-4 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href!}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                            isActive(child.href)
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {child.icon}
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <main className={cn("flex-1 transition-all duration-200", collapsed ? "ml-16" : "ml-64")}>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-6">
          <h1 className="text-lg font-semibold">
            {pathname === "/" && "대시보드"}
            {pathname.startsWith("/quotation/simple") && !pathname.includes("/quotation/simple/new") && "일반견적서"}
            {pathname.includes("/quotation/simple/new") && "일반견적서 작성"}
            {pathname.startsWith("/quotation/detailed") && "상세견적서"}
            {pathname === "/quotation" && "전체 견적서"}
            {pathname.startsWith("/master") && "마스터관리"}
            {pathname === "/ai/chat" && "AI 견적 채팅"}
            {pathname.startsWith("/ai/board") && "문의 게시판"}
            {pathname === "/ai/dashboard" && "AI 대시보드"}
            {pathname === "/ai/settings" && "AI 설정"}
            {pathname.startsWith("/import") && "임포트센터"}
            {pathname.startsWith("/settings") && "설정"}
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABEL[user.role] ?? user.role} · {user.username}
              </p>
            </div>
            <Link href="/change-password"
              className="text-xs text-gray-600 hover:text-gray-900 underline underline-offset-2">
              비밀번호 변경
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-gray-700 hover:bg-gray-100">
              <LogOut className="h-3.5 w-3.5" />로그아웃
            </button>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
