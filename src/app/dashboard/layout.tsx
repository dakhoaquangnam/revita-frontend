"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TsLogo } from "@/components/ui/ts-logo";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      const token = localStorage.getItem("revita_token");
      if (!token) {
        router.replace("/dashboard/login");
        return null;
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#fffefc] text-[#222222] flex flex-col font-sans">
      <DashboardHeader />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto bg-[#fffefc] p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
