"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  Stethoscope,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Tv,
  MonitorSmartphone,
  ChevronRight,
} from "lucide-react";
import { useAuth, REHAB_ROOMS } from "@/hooks/use-auth";

export default function DashboardOverviewPage() {
  const { user, selectedRoom } = useAuth();
  const currentRoom = REHAB_ROOMS.find((r) => r.id === selectedRoom) || REHAB_ROOMS[0];

  const getRoleDestination = () => {
    switch (user?.role) {
      case "DOCTOR":
        return {
          href: "/dashboard/doctor",
          title: "Vào Phân hệ Bác sĩ & Kỹ thuật viên PHCN",
          desc: "Gọi bệnh nhân kế tiếp, đo chỉ số FIM/ROM, kê đơn thuốc và chỉ định bài tập.",
          icon: Stethoscope,
        };
      case "RECEPTIONIST":
        return {
          href: "/dashboard/receptionist",
          title: "Vào Phân hệ Tiếp đón & Lễ tân",
          desc: "Quét mã QR phiếu hẹn, tìm kiếm SĐT/CCCD và chỉ định buồng khám phù hợp.",
          icon: Users,
        };
      case "CASHIER":
        return {
          href: "/dashboard/cashier",
          title: "Vào Phân hệ Thu ngân & Viện phí",
          desc: "Thu tiền dịch vụ, tạo mã VietQR PayOS tự động và xuất hóa đơn viện phí.",
          icon: CreditCard,
        };
      default:
        return {
          href: "/dashboard/admin",
          title: "Vào Phân hệ Báo cáo & Quản trị Hệ thống",
          desc: "Xem thống kê lượt khám, hiệu suất ca trực và doanh thu toàn phòng khám.",
          icon: Stethoscope,
        };
    }
  };

  const primaryAction = getRoleDestination();
  const ActionIcon = primaryAction.icon;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-[#e1f4df] border border-[#cfe7d3] rounded-[14px] p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#fffefc] border border-[#cfe7d3] text-[#0f3e17] text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-[#0f3e17]" />
              Ca trực ngày: 12/11/2026 • Trạng thái: Sẵn sàng
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f3e17] tracking-tight">
              Xin chào, {user?.name || "Bác sĩ / Nhân viên"}!
            </h1>
            <p className="mt-1 text-sm text-[#222222]/80 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0f3e17]" />
              <span>Đang trực tại: <strong className="text-[#0f3e17] font-bold">{currentRoom.name}</strong></span>
            </p>
          </div>

          <Link
            href={primaryAction.href}
            className="inline-flex items-center gap-3 px-6 py-3.5 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm transition-colors flex-shrink-0"
          >
            <ActionIcon className="w-5 h-5" />
            <span>Mở Bàn làm việc chuyên môn</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Realtime Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#222222]/70 font-semibold">Tổng tiếp đón hôm nay</span>
            <div className="w-8 h-8 rounded-[9px] bg-[#e1f4df] flex items-center justify-center text-[#0f3e17]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0f3e17]">42</span>
            <span className="text-xs text-[#0f3e17] flex items-center font-bold">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +15%
            </span>
          </div>
          <p className="text-[11px] text-[#222222]/60 mt-1">28 bệnh nhân đặt hẹn trước</p>
        </div>

        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#222222]/70 font-semibold">Đang chờ tại buồng</span>
            <div className="w-8 h-8 rounded-[9px] bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-800">08</span>
            <span className="text-xs text-[#222222]/60 font-medium">người bệnh</span>
          </div>
          <p className="text-[11px] text-[#222222]/60 mt-1">Thời gian chờ TB: 6 phút</p>
        </div>

        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#222222]/70 font-semibold">Đã khám & Tập PHCN</span>
            <div className="w-8 h-8 rounded-[9px] bg-[#e1f4df] flex items-center justify-center text-[#0f3e17]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0f3e17]">31</span>
            <span className="text-xs text-[#222222]/60 font-medium">ca hoàn tất</span>
          </div>
          <p className="text-[11px] text-[#222222]/60 mt-1">100% đã cập nhật thang điểm FIM</p>
        </div>

        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#222222]/70 font-semibold">Doanh thu tạm tính</span>
            <div className="w-8 h-8 rounded-[9px] bg-[#b1dbb8]/40 flex items-center justify-center text-[#0f3e17]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0f3e17]">14.8M</span>
            <span className="text-xs text-[#222222]/60 font-medium">VND</span>
          </div>
          <p className="text-[11px] text-[#222222]/60 mt-1">PayOS: 82% • Tiền mặt: 18%</p>
        </div>
      </div>

      {/* Grid: Trạng thái các buồng khám PHCN & Lối tắt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tình trạng các buồng phục hồi chức năng */}
        <div className="lg:col-span-2 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-[#0f3e17]">
                Trạng thái Hoạt động các Buồng Trị liệu & Khám bệnh
              </h2>
              <p className="text-xs text-[#222222]/70">
                Cập nhật tức thời qua kết nối WebSocket thời gian thực
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] bg-[#e1f4df] text-[#0f3e17] text-xs font-semibold border border-[#cfe7d3]">
              <span className="w-2 h-2 rounded-full bg-[#0f3e17]" />
              Live Sync
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {REHAB_ROOMS.map((room, idx) => {
              const isCurrent = room.id === selectedRoom;
              return (
                <div
                  key={room.id}
                  className={`p-4 rounded-[14px] border transition-colors ${
                    isCurrent
                      ? "bg-[#e1f4df]/40 border-[#cfe7d3]"
                      : "bg-[#fffefc] border-[#efeeeb] hover:bg-[#efeeeb]/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#0f3e17]">{room.id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-[6px] font-semibold ${
                        idx % 3 === 0
                          ? "bg-[#e1f4df] text-[#0f3e17] border border-[#cfe7d3]"
                          : "bg-[#b6ced5]/30 text-[#0f3e17] border border-[#b6ced5]"
                      }`}
                    >
                      {idx % 3 === 0 ? "Đang trống" : "Đang điều trị"}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#222222] line-clamp-1">
                    {room.name}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#222222]/70 pt-2 border-t border-[#efeeeb]">
                    <span>Số đang khám: <strong className="text-[#0f3e17] font-bold">A-0{idx + 1}</strong></span>
                    <span>Hàng đợi: <strong className="text-[#0f3e17] font-bold">0{idx + 2}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Quick Links & Sảnh chờ */}
        <div className="space-y-4">
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-6">
            <h3 className="text-sm font-bold text-[#0f3e17] mb-3.5">Màn hình Tương tác Sảnh</h3>
            <div className="space-y-3">
              <Link
                href="/tv-display"
                target="_blank"
                className="flex items-center justify-between p-3.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#e1f4df]/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[14px] bg-[#e1f4df] flex items-center justify-center text-[#0f3e17]">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0f3e17]">Màn hình TV Gọi số</div>
                    <div className="text-[10px] text-[#222222]/60">Chiếu trên TV phòng chờ sảnh lớn</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#222222]/40 group-hover:text-[#0f3e17] transition-colors" />
              </Link>

              <Link
                href="/kiosk"
                target="_blank"
                className="flex items-center justify-between p-3.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#e1f4df]/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[14px] bg-[#e1f4df] flex items-center justify-center text-[#0f3e17]">
                    <MonitorSmartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0f3e17]">Cây Kiosk Bốc số Tự động</div>
                    <div className="text-[10px] text-[#222222]/60">Màn hình cảm ứng cho người bệnh</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#222222]/40 group-hover:text-[#0f3e17] transition-colors" />
              </Link>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-4 rounded-[14px] bg-[#e1f4df]/40 border border-[#cfe7d3] text-xs text-[#222222]/80 leading-relaxed">
            <div className="font-bold text-[#0f3e17] flex items-center gap-1.5 mb-1">
              <Stethoscope className="w-4 h-4" />
              Lưu ý Phục hồi chức năng:
            </div>
            Mọi bệnh nhân sau tai biến và phẫu thuật dây chằng cần hoàn thành bảng lượng giá FIM & ROM trước khi chỉ định bài tập về nhà.
          </div>
        </div>
      </div>
    </div>
  );
}
