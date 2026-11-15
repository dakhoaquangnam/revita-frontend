"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  CreditCard,
  ShieldCheck,
  FileText,
  Volume2,
  Tv,
  MonitorSmartphone,
  LogOut,
  ExternalLink,
  DoorOpen,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TsLogo } from "@/components/ui/ts-logo";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badge?: string;
}

export function DashboardSidebar({
  className,
  onNavigate,
}: {
  // Mặc định: sidebar desktop (ẩn trên mobile, hiện từ lg trở lên).
  // Khi dùng trong ngăn kéo mobile, layout truyền className riêng.
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems: NavItem[] = [
    {
      name: "Tổng quan chung",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["ADMIN", "DOCTOR", "RECEPTIONIST", "CASHIER", "TECHNICIAN"],
    },
    {
      name: "Buồng khám Bác sĩ",
      href: "/dashboard/doctor",
      icon: Stethoscope,
      roles: ["ADMIN", "DOCTOR", "TECHNICIAN"],
    },
    {
      name: "Màn hình phòng",
      href: "/dashboard/room",
      icon: DoorOpen,
      roles: ["ADMIN", "DOCTOR", "TECHNICIAN", "RECEPTIONIST"],
    },
    {
      name: "Quầy Tiếp đón & Lễ tân",
      href: "/dashboard/receptionist",
      icon: Users,
      roles: ["ADMIN", "RECEPTIONIST"],
    },
    {
      name: "Quầy Thu ngân & Viện phí",
      href: "/dashboard/cashier",
      icon: CreditCard,
      roles: ["ADMIN", "CASHIER"],
    },
    {
      name: "Báo cáo & Quản trị Hệ thống",
      href: "/dashboard/admin",
      icon: ShieldCheck,
      roles: ["ADMIN"],
    },
    {
      name: "Cấu hình giọng đọc",
      href: "/dashboard/voice",
      icon: Volume2,
      roles: ["ADMIN"],
    },
    {
      name: "Bài viết & Quảng bá",
      href: "/dashboard/posts",
      icon: FileText,
      roles: ["ADMIN"],
    },
  ];

  const userRole = user?.role || "ADMIN";
  const accessibleItems = navItems.filter(
    (item) => userRole === "ADMIN" || item.roles.includes(userRole)
  );

  return (
    <aside
      className={
        className ??
        "hidden lg:flex w-64 shrink-0 bg-[#fffefc] border-r border-[#efeeeb] text-[#222222] flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none"
      }
    >
      {/* Top section: Main Navigation */}
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Brand Clinic Info */}
        <Link href="/" className="block" onClick={onNavigate}>
          <div className="flex items-center gap-2.5 px-3 py-2 bg-[#e1f4df]/40 rounded-[14px] border border-[#cfe7d3] hover:bg-[#e1f4df]/60 transition-colors">
            <TsLogo size="sm" showText={true} />
          </div>
        </Link>

        {/* Section: Chuyên môn & Nghiệp vụ */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-[#222222]/50 uppercase tracking-wider">
            Không gian nghiệp vụ
          </div>
          <nav className="space-y-1">
            {accessibleItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-[14px] text-xs font-semibold transition-colors group ${
                    isActive
                      ? "bg-[#0f3e17] text-[#fffefc]"
                      : "text-[#222222]/80 hover:text-[#0f3e17] hover:bg-[#e1f4df]/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive ? "text-[#fffefc]" : "text-[#0f3e17]/70 group-hover:text-[#0f3e17]"
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-[999px] font-semibold ${
                        isActive
                          ? "bg-[#fffefc]/20 text-[#fffefc]"
                          : "bg-[#e1f4df] text-[#0f3e17] border border-[#cfe7d3]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Section: Màn hình Phụ trợ sảnh */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-[#222222]/50 uppercase tracking-wider">
            Màn hình Ngoại vi Sảnh
          </div>
          <div className="space-y-1">
            <Link
              href="/kiosk"
              target="_blank"
              onClick={onNavigate}
              className="flex items-center justify-between px-3.5 py-2 rounded-[14px] text-xs font-medium text-[#222222]/70 hover:text-[#0f3e17] hover:bg-[#e1f4df]/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <MonitorSmartphone className="w-4 h-4 text-[#0f3e17]" />
                <span>Kiosk Bốc số Tự động</span>
              </div>
              <ExternalLink className="w-3 h-3 text-[#222222]/40" />
            </Link>

            <Link
              href="/tv-display"
              target="_blank"
              onClick={onNavigate}
              className="flex items-center justify-between px-3.5 py-2 rounded-[14px] text-xs font-medium text-[#222222]/70 hover:text-[#0f3e17] hover:bg-[#e1f4df]/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-[#0f3e17]" />
                <span>TV Gọi số Buồng khám</span>
              </div>
              <ExternalLink className="w-3 h-3 text-[#222222]/40" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom section: User Info & Logout */}
      <div className="p-4 border-t border-[#efeeeb] space-y-3">
        <div className="flex items-center justify-between text-xs px-2">
          <span className="text-[#222222]/60">Máy chủ API:</span>
          <span className="font-mono text-[11px] font-semibold text-[#0f3e17] bg-[#e1f4df] px-2 py-0.5 rounded-[6px]">
            :3000 Sẵn sàng
          </span>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-rose-50 text-rose-700 hover:border-rose-200 text-xs font-semibold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Đăng xuất phiên làm việc</span>
        </button>
      </div>
    </aside>
  );
}
