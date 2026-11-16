"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  MapPin,
  Tv,
  MonitorSmartphone,
  Check,
  User,
  LogOut,
  Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { receptionistService, RoomItem } from "@/services/receptionist.service";

export function DashboardHeader({
  onMenuClick,
}: {
  // Mobile: mở ngăn kéo sidebar. Desktop không cần (sidebar luôn hiện).
  onMenuClick?: () => void;
}) {
  const { user, selectedRoom, setSelectedRoom, logout } = useAuth();
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  // GĐ2 bước 6 — danh sách phòng thật từ GET /routing/rooms (lọc chuyên
  // khoa PHCN), thay cho hằng số REHAB_ROOMS ghi cứng đã xóa. Mã phòng cũ
  // (ROOM-101...) không có trong DB nên không khớp được thì về phòng đầu tiên.
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    receptionistService
      .getRooms()
      .then((list) => {
        if (cancelled) return;
        const phcn = list.filter((r) => r.specialtyName === "Phục hồi chức năng");
        setRooms(phcn);
        // Mã phòng cũ đã lưu (ROOM-101...) không có trong DB: sửa về phòng
        // thật đầu tiên để dropdown không trống và lần sau không lưu mã sai.
        if (phcn.length > 0 && !phcn.some((r) => r.id === selectedRoom)) {
          setSelectedRoom(phcn[0].id);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Chỉ chạy 1 lần khi mở trang: sửa mã cũ đã lưu, không chạy lại mỗi lần chọn phòng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const activeRoom = rooms.find((r) => r.id === selectedRoom) ?? rooms[0];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "DOCTOR":
        return <span className="bg-[#e1f4df] text-[#0f3e17] border border-[#efeeeb] text-[10px] font-semibold px-2 py-0.5 rounded-full">Bác sĩ PHCN</span>;
      case "RECEPTIONIST":
        return <span className="bg-[#b6ced5]/40 text-[#0f3e17] border border-[#efeeeb] text-[10px] font-semibold px-2 py-0.5 rounded-full">Lễ tân tiếp đón</span>;
      case "CASHIER":
        return <span className="bg-[#b1dbb8]/40 text-[#0f3e17] border border-[#efeeeb] text-[10px] font-semibold px-2 py-0.5 rounded-full">Thu ngân viện phí</span>;
      case "ADMIN":
        return <span className="bg-[#cfe7d3]/50 text-[#0f3e17] border border-[#efeeeb] text-[10px] font-semibold px-2 py-0.5 rounded-full">Quản trị hệ thống</span>;
      default:
        return <span className="bg-[#efeeeb] text-[#222222] text-[10px] px-2 py-0.5 rounded-full">{role || "Nhân viên"}</span>;
    }
  };

  return (
    <header className="h-16 bg-[#fffefc] border-b border-[#efeeeb] text-[#222222] flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0">
      {/* Left: Nút mở menu (chỉ mobile) + Buồng trực hiện tại */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Mở menu điều hướng"
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-[14px] bg-[#fffefc] hover:bg-[#e1f4df]/40 border border-[#efeeeb] text-[#0f3e17] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRoomDropdown(!showRoomDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[14px] bg-[#fffefc] hover:bg-[#e1f4df]/40 border border-[#efeeeb] text-xs transition-colors"
          >
            <MapPin className="w-4 h-4 text-[#0f3e17]" />
            <div className="text-left hidden sm:block">
              <div className="text-[10px] text-[#222222]/60 leading-tight">Buồng trực hiện tại</div>
              <div className="font-semibold text-[#0f3e17] truncate max-w-[200px]">{activeRoom?.roomName ?? "Đang tải danh sách phòng..."}</div>
            </div>
            <div className="sm:hidden font-semibold text-[#0f3e17]">{activeRoom?.roomCode ?? "—"}</div>
            <ChevronDown className="w-3.5 h-3.5 text-[#222222]/50 ml-1" />
          </button>

          {/* Room Dropdown */}
          {showRoomDropdown && (
            <div
              className="absolute left-0 mt-2 w-72 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] py-2 z-50"
              onMouseLeave={() => setShowRoomDropdown(false)}
            >
              <div className="px-3 py-1.5 border-b border-[#efeeeb] text-[#0f3e17] eyebrow">
                Chuyển đổi Buồng khám / Quầy trực
              </div>
              {rooms.length === 0 && (
                <div className="px-3 py-2 text-xs text-[#222222]/70">
                  Đang tải danh sách phòng...
                </div>
              )}
              {rooms.map((room) => (
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
                  <span className="truncate pr-2">{room.roomName}</span>
                  {selectedRoom === room.id && <Check className="w-4 h-4 text-[#0f3e17] flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Status indicator */}
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
            isOnline
              ? "bg-[#e1f4df] text-[#0f3e17] border-[#efeeeb]"
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
            <div className="w-8 h-8 rounded-full bg-[#0f3e17] flex items-center justify-center text-[#fffefc] font-semibold text-xs">
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
              className="absolute right-0 mt-2 w-56 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] py-2 z-50"
              onMouseLeave={() => setShowUserDropdown(false)}
            >
              <div className="px-4 py-2 border-b border-[#efeeeb]">
                <p className="text-xs font-semibold text-[#0f3e17]">{user?.name || "Người dùng"}</p>
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
