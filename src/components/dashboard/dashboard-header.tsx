"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  MapPin,
  Tv,
  MonitorSmartphone,
  Check,
  User,
  LogOut,
} from "lucide-react";
import { useAuth, REHAB_ROOMS } from "@/hooks/use-auth";

export function DashboardHeader() {
  const { user, selectedRoom, setSelectedRoom, logout } = useAuth();
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const activeRoomObj = REHAB_ROOMS.find((r) => r.id === selectedRoom) || REHAB_ROOMS[0];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "DOCTOR":
        return <span className="bg-[#e1f4df] text-[#0f3e17] border border-[#cfe7d3] text-[10px] font-semibold px-2 py-0.5 rounded-[6px]">Bác sĩ PHCN</span>;
      case "RECEPTIONIST":
        return <span className="bg-[#b6ced5]/40 text-[#0f3e17] border border-[#b6ced5] text-[10px] font-semibold px-2 py-0.5 rounded-[6px]">Lễ tân tiếp đón</span>;
      case "CASHIER":
        return <span className="bg-[#b1dbb8]/40 text-[#0f3e17] border border-[#b1dbb8] text-[10px] font-semibold px-2 py-0.5 rounded-[6px]">Thu ngân viện phí</span>;
      case "ADMIN":
        return <span className="bg-[#cfe7d3]/50 text-[#0f3e17] border border-[#cfe7d3] text-[10px] font-semibold px-2 py-0.5 rounded-[6px]">Quản trị hệ thống</span>;
      default:
        return <span className="bg-[#efeeeb] text-[#222222] text-[10px] px-2 py-0.5 rounded-[6px]">{role || "Nhân viên"}</span>;
    }
  };

  return (
    <header className="h-16 bg-[#fffefc] border-b border-[#efeeeb] text-[#222222] flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0">
      {/* Left: Current Active Room Selector */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRoomDropdown(!showRoomDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[14px] bg-[#fffefc] hover:bg-[#e1f4df]/40 border border-[#efeeeb] text-xs transition-colors"
          >
            <MapPin className="w-4 h-4 text-[#0f3e17]" />
            <div className="text-left hidden sm:block">
              <div className="text-[10px] text-[#222222]/60 leading-tight">Buồng trực hiện tại</div>
              <div className="font-semibold text-[#0f3e17] truncate max-w-[200px]">{activeRoomObj.name}</div>
            </div>
            <div className="sm:hidden font-semibold text-[#0f3e17]">{activeRoomObj.id}</div>
            <ChevronDown className="w-3.5 h-3.5 text-[#222222]/50 ml-1" />
          </button>

          {/* Room Dropdown */}
          {showRoomDropdown && (
            <div
              className="absolute left-0 mt-2 w-72 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] py-2 z-50 shadow-md"
              onMouseLeave={() => setShowRoomDropdown(false)}
            >
              <div className="px-3 py-1.5 border-b border-[#efeeeb] text-[11px] font-semibold text-[#0f3e17] uppercase tracking-wider">
                Chuyển đổi Buồng khám / Quầy trực
              </div>
              {REHAB_ROOMS.map((room) => (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedRoom(room.id);
                    setShowRoomDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#e1f4df]/40 transition-colors ${
                    selectedRoom === room.id ? "bg-[#e1f4df] text-[#0f3e17] font-semibold" : "text-[#222222]"
                  }`}
                >
                  <span className="truncate pr-2">{room.name}</span>
                  {selectedRoom === room.id && <Check className="w-4 h-4 text-[#0f3e17] flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Status indicator */}
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold border transition-colors ${
            isOnline
              ? "bg-[#e1f4df] text-[#0f3e17] border-[#cfe7d3]"
              : "bg-amber-50 text-amber-900 border-amber-200"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-[#0f3e17]" : "bg-amber-500"}`} />
          {isOnline ? "Đang tiếp nhận" : "Tạm ngưng"}
        </button>
      </div>

      {/* Right: Quick actions & User profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Quick Launch TV Display */}
        <Link
          href="/tv-display"
          target="_blank"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] text-xs text-[#222222]/80 hover:text-[#0f3e17] bg-[#fffefc] hover:bg-[#e1f4df]/40 border border-[#efeeeb] transition-colors"
          title="Mở màn hình TV gọi số sảnh chờ tab riêng"
        >
          <Tv className="w-3.5 h-3.5 text-[#0f3e17]" />
          <span>Màn hình TV Sảnh</span>
        </Link>

        {/* Quick Launch Kiosk */}
        <Link
          href="/kiosk"
          target="_blank"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] text-xs text-[#222222]/80 hover:text-[#0f3e17] bg-[#fffefc] hover:bg-[#e1f4df]/40 border border-[#efeeeb] transition-colors"
          title="Mở màn hình Kiosk tự bốc số tab riêng"
        >
          <MonitorSmartphone className="w-3.5 h-3.5 text-[#0f3e17]" />
          <span>Kiosk Bốc số</span>
        </Link>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-[14px] hover:bg-[#e1f4df]/30 border border-transparent hover:border-[#efeeeb] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#0f3e17] flex items-center justify-center text-[#fffefc] font-bold text-xs">
              {user?.name ? user.name.charAt(0) : "U"}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-[#0f3e17] leading-tight">
                {user?.name || "Nhân viên y tế"}
              </div>
              <div className="mt-0.5">{getRoleBadge(user?.role)}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#222222]/40 hidden sm:block" />
          </button>

          {showUserDropdown && (
            <div
              className="absolute right-0 mt-2 w-56 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] py-2 z-50 shadow-md"
              onMouseLeave={() => setShowUserDropdown(false)}
            >
              <div className="px-4 py-2 border-b border-[#efeeeb]">
                <p className="text-xs font-bold text-[#0f3e17]">{user?.name || "Người dùng"}</p>
                <p className="text-[11px] text-[#222222]/60 truncate">{user?.phone || user?.id}</p>
              </div>

              <div className="py-1">
                <Link
                  href="/tai-khoan"
                  className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-[#222222] hover:bg-[#e1f4df]/40 transition-colors"
                >
                  <User className="w-4 h-4 text-[#0f3e17]" />
                  <span>Hồ sơ cá nhân</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-rose-700 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Đăng xuất phiên làm việc</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
