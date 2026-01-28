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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
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
      { label: "일반견적서", href: "/quotation/simple", icon: <FileText className="h-4 w-4" /> },
      { label: "상세견적서", href: "/quotation/detailed", icon: <FileSpreadsheet className="h-4 w-4" /> },
      { label: "전체목록", href: "/quotation", icon: <FileText className="h-4 w-4" /> },
    ],
  },
  {
    label: "마스터관리",
    icon: <Package className="h-4 w-4" />,
    children: [
      { label: "제품유형", href: "/master/product-type", icon: <Tags className="h-4 w-4" /> },
      { label: "가공비", href: "/master/processing-cost", icon: <DollarSign className="h-4 w-4" /> },
      { label: "원료", href: "/master/material", icon: <FlaskConical className="h-4 w-4" /> },
      { label: "공급사", href: "/master/supplier", icon: <Truck className="h-4 w-4" /> },
      { label: "자재", href: "/master/supply", icon: <Box className="h-4 w-4" /> },
      { label: "공정", href: "/master/process", icon: <Cog className="h-4 w-4" /> },
      { label: "고객사", href: "/master/customer", icon: <Factory className="h-4 w-4" /> },
    ],
  },
  {
    label: "임포트센터",
    icon: <Download className="h-4 w-4" />,
    children: [
      { label: "파일 임포트", href: "/import", icon: <Download className="h-4 w-4" /> },
      { label: "매핑 템플릿", href: "/import/template", icon: <Link2 className="h-4 w-4" /> },
      { label: "임포트 이력", href: "/import/history", icon: <History className="h-4 w-4" /> },
    ],
  },
  {
    label: "설정",
    icon: <Settings className="h-4 w-4" />,
    children: [
      { label: "사용자", href: "/settings/users", icon: <Users className="h-4 w-4" /> },
      { label: "권한", href: "/settings/roles", icon: <Shield className="h-4 w-4" /> },
      { label: "회사", href: "/settings/company", icon: <Building2 className="h-4 w-4" /> },
    ],
  },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["견적서", "마스터관리"]);

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
          {menuItems.map((item) => (
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
            {pathname.startsWith("/quotation/simple") && "일반견적서"}
            {pathname.startsWith("/quotation/detailed") && "상세견적서"}
            {pathname === "/quotation" && "전체 견적서"}
            {pathname.startsWith("/master") && "마스터관리"}
            {pathname.startsWith("/import") && "임포트센터"}
            {pathname.startsWith("/settings") && "설정"}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">홍길동</span>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
