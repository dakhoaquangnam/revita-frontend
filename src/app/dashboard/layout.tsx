"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TsLogo } from "@/components/ui/ts-logo";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { readSession } from "@/lib/session-store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Đóng ngăn kéo mobile mỗi khi chuyển trang.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Nếu đang ở trang login thì render độc lập
  if (pathname === "/dashboard/login") {
    return <>{children}</>;
  }

  // Chờ hydration và kiểm tra auth
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#fffefc] flex flex-col items-center justify-center text-[#0f3e17]">
        <div className="mb-4">
          <TsLogo size="lg" showText={false} />
        </div>
        <p className="text-sm font-semibold">Đang tải Không gian Làm việc Bác sĩ Thanh Sang...</p>
      </div>
    );
  }

  // Nếu chưa đăng nhập, tự động chuyển về trang login
  if (!user) {
    if (typeof window !== "undefined") {
      // Đọc phiên từ cả hai kho (ghi nhớ = localStorage, không = sessionStorage).
      // Token còn hay không do AuthProvider quyết định (làm mới im lặng nếu hết
      // hạn); ở đây chỉ còn trường hợp thật sự chưa có phiên.
      if (!readSession()?.accessToken) {
        router.replace("/dashboard/login");
        return null;
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#fffefc] text-[#222222] flex flex-col font-sans">
      <DashboardHeader onMenuClick={() => setMobileNavOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        {/* Ngăn kéo sidebar trên mobile: sidebar desktop đã ẩn dưới lg. */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-[#0f3e17]/60 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full">
              <DashboardSidebar
                onNavigate={() => setMobileNavOpen(false)}
                className="flex w-64 h-full bg-[#fffefc] border-r border-[#efeeeb] text-[#222222] flex-col justify-between select-none"
              />
            </div>
          </div>
        )}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#fffefc] p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
