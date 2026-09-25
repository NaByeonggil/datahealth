import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Sidebar from "@/components/layout/Sidebar";
import { getCurrentUser } from "@/lib/auth/session";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "헬씨팜바이오 견적서 시스템",
  description: "건강기능식품 견적서 관리 시스템",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // 로그인 화면과 비밀번호 변경 화면은 사이드바 없이 단독으로 띄운다
  const bare = !user || user.mustChangePassword;

  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {bare ? children : <Sidebar user={user}>{children}</Sidebar>}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
