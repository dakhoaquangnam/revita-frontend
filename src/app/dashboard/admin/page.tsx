"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Users,
  Layers,
  CreditCard,
  Stethoscope,
  Printer,
  Clock,
  Edit2,
  Save,
  Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ServicePriceItem, StaffScheduleItem } from "@/services/admin.service";

const INITIAL_SERVICES: ServicePriceItem[] = [
  {
    id: "srv-01",
    code: "LG-01",
    name: "Khám & Lượng giá Chức năng Ban đầu (Thang điểm FIM & Thước đo ROM)",
    category: "ASSESSMENT",
    durationMinutes: 45,
    price: 200000,
    isActive: true,
  },
  {
    id: "srv-02",
    code: "TB-01",
    name: "Tập Phục hồi chức năng sau Tai biến Đột quỵ 1:1 cùng Kỹ thuật viên",
    category: "PHYSICAL",
    durationMinutes: 60,
    price: 350000,
    isActive: true,
  },
  {
    id: "srv-03",
    code: "KG-01",
    name: "Kéo giãn cột sống thắt lưng & cột sống cổ bằng máy kéo tự động",
    category: "PHYSICAL",
    durationMinutes: 30,
    price: 300000,
    isActive: true,
  },
  {
    id: "srv-04",
    code: "SW-01",
    name: "Điều trị Sóng xung kích Shockwave giảm đau xơ hóa gân cơ",
    category: "PHYSICAL",
    durationMinutes: 20,
    price: 350000,
    isActive: true,
  },
  {
    id: "srv-05",
    code: "DX-01",
    name: "Điện xung trị liệu giảm đau thần kinh TENS & Sóng ngắn vi ba",
    category: "PHYSICAL",
    durationMinutes: 30,
    price: 150000,
    isActive: true,
  },
  {
    id: "srv-06",
    code: "HD-01",
    name: "Hoạt động trị liệu phục hồi chức năng bàn tay và sinh hoạt hàng ngày (ADL)",
    category: "OCCUPATIONAL",
    durationMinutes: 45,
    price: 250000,
    isActive: true,
  },
  {
    id: "srv-07",
    code: "AN-01",
    name: "Âm ngữ trị liệu (ST) phục hồi phát âm & nuốt nghẹn sau đột quỵ",
    category: "SPEECH",
    durationMinutes: 45,
    price: 300000,
    isActive: true,
  },
];

const INITIAL_STAFF: StaffScheduleItem[] = [
  {
    id: "st-01",
    name: "BS.CKII Lâm Thanh Tú",
    role: "DOCTOR",
    specialty: "Trưởng khoa PHCN & Đột quỵ Não",
    shift: "MORNING",
    assignedRoom: "ROOM-101: Khám Lượng giá & Bác sĩ trưởng",
    status: "ONLINE",
  },
  {
    id: "st-02",
    name: "ThS.BS Nguyễn Minh Tâm",
    role: "DOCTOR",
    specialty: "Phục hồi chức năng Tim mạch & Hô hấp",
    shift: "AFTERNOON",
    assignedRoom: "ROOM-101: Khám Lượng giá & Bác sĩ trưởng",
    status: "OFFLINE",
  },
  {
    id: "st-03",
    name: "KTV. Hoàng Minh Nam",
    role: "TECHNICIAN",
    specialty: "Kỹ thuật viên Vận động trị liệu 1:1",
    shift: "MORNING",
    assignedRoom: "ROOM-201: Hoạt động trị liệu & Vận động",
    status: "ONLINE",
  },
  {
    id: "st-04",
    name: "KTV. Lê Mai Lan",
    role: "TECHNICIAN",
    specialty: "Kỹ thuật viên Điện trị liệu & Sóng ngắn",
    shift: "MORNING",
    assignedRoom: "ROOM-102: Vật lý trị liệu (Điện xung / Sóng ngắn)",
    status: "BUSY",
  },
  {
    id: "st-05",
    name: "CN. Lê Hoàng Khang",
    role: "RECEPTIONIST",
    specialty: "Tiếp đón & Quản lý Thẻ người bệnh",
    shift: "MORNING",
    assignedRoom: "Quầy Tiếp Nhận 1",
    status: "ONLINE",
  },
];

export default function AdminWorkspacePage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"STATS" | "STAFF" | "PRICING">("STATS");
  const [services, setServices] = useState<ServicePriceItem[]>(INITIAL_SERVICES);
  const [staffList, setStaffList] = useState<StaffScheduleItem[]>(INITIAL_STAFF);

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  const [showReportModal, setShowReportModal] = useState(false);

  const handleStartEdit = (service: ServicePriceItem) => {
    setEditingServiceId(service.id);
    setEditPrice(service.price);
  };

  const handleSavePrice = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, price: editPrice } : s))
    );
    setEditingServiceId(null);
  };

  const handleToggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const handleShiftChange = (
    staffId: string,
    newShift: "MORNING" | "AFTERNOON" | "EVENING"
  ) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, shift: newShift } : s))
    );
  };

  return (
    <div className="space-y-6 text-[#222222]">
      {/* Top Banner: Admin & System Header */}
      <div className="bg-[#e1f4df] border border-[#efeeeb] rounded-[14px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fffefc] border border-[#efeeeb] text-[#0f3e17] text-xs font-semibold mb-2">
            <ShieldCheck className="w-4 h-4 text-[#0f3e17]" />
            <span>Phân hệ Báo cáo & Quản trị Hệ thống</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display-serif text-[#0f3e17] tracking-[-0.01em]">
            Trung tâm Điều hành & Quản trị: {user?.name || "Trần Đình Kiên"}
          </h1>
          <p className="text-xs text-[#222222]/80 mt-1">
            Phòng khám Phục hồi Chức năng Bác sĩ Thanh Sang • 193 Quang Trung, Đại Lộc, Đà Nẵng
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Xuất Báo cáo HĐQT</span>
          </button>
        </div>
      </div>

      {/* KPI Realtime Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5">
          <div className="flex items-center justify-between text-xs text-[#222222]/70 font-semibold">
            <span>Tổng Doanh thu Tháng</span>
            <div className="w-8 h-8 rounded-[14px] bg-[#e1f4df] flex items-center justify-center text-[#0f3e17]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-display-serif text-[#0f3e17] tracking-[-0.01em]">385.0M</span>
            <span className="text-xs text-[#0f3e17] flex items-center font-semibold">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +18.5%
            </span>
          </div>
          <p className="text-[11px] text-[#222222]/60 mt-1">PayOS: 298.5M (78%) • Tiền mặt: 86.5M</p>
        </div>

        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5">
          <div className="flex items-center justify-between text-xs text-[#222222]/70 font-semibold">
            <span>Tổng Lượt Khám & Trị liệu</span>
            <div className="w-8 h-8 rounded-[14px] bg-[#e1f4df] flex items-center justify-center text-[#0f3e17]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-display-serif text-[#0f3e17] tracking-[-0.01em]">1,248</span>
            <span className="text-xs text-[#0f3e17] font-semibold">+12% MoM</span>
          </div>
          <p className="text-[11px] text-[#222222]/60 mt-1">Trung bình: 42 bệnh nhân / ngày</p>
        </div>

        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5">
          <div className="flex items-center justify-between text-xs text-[#222222]/70 font-semibold">
            <span>Tỷ lệ Phục hồi Độc lập (FIM)</span>
            <div className="w-8 h-8 rounded-[14px] bg-[#b1dbb8]/40 flex items-center justify-center text-[#0f3e17]">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-display-serif text-[#0f3e17] tracking-[-0.01em]">84.2%</span>
            <span className="text-xs text-[#0f3e17] font-semibold">Đạt chuẩn</span>
          </div>
          <p className="text-[11px] text-[#222222]/60 mt-1">Tăng trung bình +24 điểm FIM sau liệu trình</p>
        </div>

        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5">
          <div className="flex items-center justify-between text-xs text-[#222222]/70 font-semibold">
            <span>Tỷ lệ Quay lại Tái khám</span>
            <div className="w-8 h-8 rounded-[14px] bg-[#b6ced5]/30 flex items-center justify-center text-[#0f3e17]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-display-serif text-[#0f3e17] tracking-[-0.01em]">76.4%</span>
            <span className="text-xs text-[#0f3e17] font-semibold">Gắn kết cao</span>
          </div>
          <p className="text-[11px] text-[#222222]/60 mt-1">Đánh giá hài lòng 4.9 / 5.0 sao</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-7 sm:p-8 space-y-6">
        <div className="flex border-b border-[#efeeeb] pb-3 gap-2 sm:gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("STATS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === "STATS"
                ? "bg-[#0f3e17] text-[#fffefc]"
                : "text-[#222222]/70 hover:text-[#0f3e17] hover:bg-[#e1f4df]/40"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Thống kê Doanh thu & Cơ cấu Dịch vụ PHCN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("STAFF")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === "STAFF"
                ? "bg-[#0f3e17] text-[#fffefc]"
                : "text-[#222222]/70 hover:text-[#0f3e17] hover:bg-[#e1f4df]/40"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Quản lý Nhân sự & Phân ca Buồng trực ({staffList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PRICING")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === "PRICING"
                ? "bg-[#0f3e17] text-[#fffefc]"
                : "text-[#222222]/70 hover:text-[#0f3e17] hover:bg-[#e1f4df]/40"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. Danh mục Dịch vụ & Bảng giá Viện phí ({services.length})</span>
          </button>
        </div>

        {/* TAB 1: THỐNG KÊ DOANH THU & CƠ CẤU */}
        {activeTab === "STATS" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Biểu đồ Doanh thu theo tuần (7 Cols) */}
              <div className="lg:col-span-7 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[#0f3e17] eyebrow">
                    Xu hướng Doanh thu 4 tuần gần nhất (Triệu VND)
                  </h3>
                  <span className="text-[11px] text-[#0f3e17] font-semibold">Tăng trưởng đều</span>
                </div>

                <div className="h-56 flex items-end justify-between gap-4 pt-6 pb-2 px-4 border-b border-[#efeeeb]">
                  {[
                    { week: "Tuần 1", rev: 82.5, percent: "65%" },
                    { week: "Tuần 2", rev: 94.0, percent: "75%" },
                    { week: "Tuần 3", rev: 98.5, percent: "82%" },
                    { week: "Tuần 4 (HT)", rev: 110.0, percent: "92%" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <span className="text-[11px] font-semibold text-[#0f3e17] transition-colors">
                        {item.rev}M
                      </span>
                      <div className="w-full max-w-[48px] bg-[#efeeeb] rounded-t-[7px] h-full flex items-end overflow-hidden">
                        <div
                          className="w-full bg-[#0f3e17] rounded-t-[7px] transition-all duration-700"
                          style={{ height: item.percent }}
                        />
                      </div>
                      <span className="text-xs text-[#222222]/70">{item.week}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs text-[#222222]/70 pt-1">
                  <span>Mục tiêu tháng: <strong>350.0M</strong></span>
                  <span className="text-[#0f3e17] font-semibold">Vượt mục tiêu: +110%</span>
                </div>
              </div>

              {/* Cơ cấu Tỷ trọng Dịch vụ (5 Cols) */}
              <div className="lg:col-span-5 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5 space-y-4">
                <h3 className="text-[#0f3e17] eyebrow">
                  Cơ cấu Doanh thu theo Chuyên khoa PHCN
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <div className="flex justify-between text-[#222222] mb-1">
                      <span>Tập Phục hồi chức năng sau Tai biến 1:1</span>
                      <strong className="text-[#0f3e17]">42% (161.7M)</strong>
                    </div>
                    <div className="w-full bg-[#efeeeb] rounded-full h-2">
                      <div className="bg-[#0f3e17] h-2 rounded-full" style={{ width: "42%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#222222] mb-1">
                      <span>Vật lý trị liệu Giảm đau (Điện xung, Sóng ngắn, Kéo giãn)</span>
                      <strong className="text-[#0f3e17]">28% (107.8M)</strong>
                    </div>
                    <div className="w-full bg-[#efeeeb] rounded-full h-2">
                      <div className="bg-[#0f3e17] h-2 rounded-full" style={{ width: "28%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#222222] mb-1">
                      <span>Khám Lượng giá Ban đầu (FIM / ROM)</span>
                      <strong className="text-[#0f3e17]">18% (69.3M)</strong>
                    </div>
                    <div className="w-full bg-[#efeeeb] rounded-full h-2">
                      <div className="bg-[#0f3e17] h-2 rounded-full" style={{ width: "18%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#222222] mb-1">
                      <span>Thuốc hỗ trợ thần kinh & cơ xương khớp</span>
                      <strong className="text-[#0f3e17]">12% (46.2M)</strong>
                    </div>
                    <div className="w-full bg-[#efeeeb] rounded-full h-2">
                      <div className="bg-[#0f3e17] h-2 rounded-full" style={{ width: "12%" }} />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#e1f4df]/40 border border-[#efeeeb] text-[11px] text-[#0f3e17] leading-relaxed">
                  💡 <strong>Gợi ý vận hành:</strong> Dịch vụ tập tai biến 1:1 có biên lợi nhuận và mức độ gắn kết tái khám cao nhất (trung bình 12 buổi/liệu trình).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ NHÂN SỰ & PHÂN CA TRỰC */}
        {activeTab === "STAFF" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[#0f3e17] eyebrow">
                  Lịch Phân ca & Buồng khám Trực tiếp
                </h3>
                <p className="text-xs text-[#222222]/70">
                  Điều phối bác sĩ chuyên khoa và kỹ thuật viên vật lý trị liệu theo từng khung giờ
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#222222]/60">Đang trực:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#e1f4df] text-[#0f3e17] border border-[#efeeeb] font-semibold">
                  {staffList.filter((s) => s.status === "ONLINE" || s.status === "BUSY").length} nhân sự
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#efeeeb] text-[#222222]/60 bg-[#e1f4df]/20">
                    <th className="p-2.5">Nhân sự Y tế</th>
                    <th className="p-2.5">Vai trò & Chuyên khoa</th>
                    <th className="p-2.5">Ca làm việc</th>
                    <th className="p-2.5">Buồng khám phụ trách</th>
                    <th className="p-2.5">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efeeeb]">
                  {staffList.map((st) => (
                    <tr key={st.id} className="text-[#222222] hover:bg-[#efeeeb]/30">
                      <td className="p-2.5 pr-2">
                        <div className="font-semibold text-[#0f3e17] text-sm">{st.name}</div>
                        <span className="text-[11px] text-[#222222]/50">ID: {st.id}</span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-[#222222]">{st.role}</div>
                        <div className="text-[11px] text-[#222222]/60">{st.specialty}</div>
                      </td>
                      <td className="p-2.5">
                        <select
                          value={st.shift}
                          onChange={(e) =>
                            handleShiftChange(st.id, e.target.value as any)
                          }
                          className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] px-2.5 py-1 text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                        >
                          <option value="MORNING">Ca Sáng (07:30 - 11:30)</option>
                          <option value="AFTERNOON">Ca Chiều (13:30 - 17:30)</option>
                          <option value="EVENING">Ca Tối (17:30 - 19:30)</option>
                        </select>
                      </td>
                      <td className="p-2.5 font-medium text-[#0f3e17]">
                        {st.assignedRoom}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 ${
                            st.status === "ONLINE"
                              ? "bg-[#e1f4df] text-[#0f3e17] border border-[#efeeeb]"
                              : st.status === "BUSY"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-[#efeeeb] text-[#222222]/60"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              st.status === "ONLINE"
                                ? "bg-[#0f3e17]"
                                : st.status === "BUSY"
                                ? "bg-amber-600"
                                : "bg-[#222222]/30"
                            }`}
                          />
                          {st.status === "ONLINE"
                            ? "Sẵn sàng"
                            : st.status === "BUSY"
                            ? "Đang trị liệu"
                            : "Vắng ca"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: BẢNG GIÁ DỊCH VỤ & DANH MỤC PHCN */}
        {activeTab === "PRICING" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[#0f3e17] eyebrow">
                  Bảng giá Niêm yết Dịch vụ Kỹ thuật PHCN
                </h3>
                <p className="text-xs text-[#222222]/70">
                  Giá đã bao gồm chi phí lượng giá lâm sàng và kỹ thuật viên hướng dẫn 1:1
                </p>
              </div>

              <button
                type="button"
                onClick={() => alert("Tính năng thêm dịch vụ mới sẵn sàng lưu vào bảng services.")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Dịch vụ mới</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#efeeeb] text-[#222222]/60 bg-[#e1f4df]/20">
                    <th className="p-2.5">Mã DV</th>
                    <th className="p-2.5">Tên Kỹ thuật / Dịch vụ</th>
                    <th className="p-2.5 text-center">Thời lượng</th>
                    <th className="p-2.5 text-right">Đơn giá Niêm yết</th>
                    <th className="p-2.5 text-center">Trạng thái</th>
                    <th className="p-2.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efeeeb]">
                  {services.map((srv) => {
                    const isEditing = editingServiceId === srv.id;
                    return (
                      <tr key={srv.id} className="text-[#222222] hover:bg-[#efeeeb]/30">
                        <td className="p-2.5 font-semibold text-[#0f3e17]">{srv.code}</td>
                        <td className="p-2.5 pr-2">
                          <div className="font-semibold text-[#0f3e17]">{srv.name}</div>
                          <span className="text-[10px] text-[#222222]/50 uppercase">{srv.category}</span>
                        </td>
                        <td className="p-2.5 text-center text-[#222222]/70">{srv.durationMinutes} phút</td>
                        <td className="p-2.5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(Number(e.target.value))}
                                className="w-24 px-2 py-1 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-[#0f3e17] text-right"
                              />
                              <button
                                type="button"
                                onClick={() => handleSavePrice(srv.id)}
                                className="p-1 text-[#0f3e17] hover:text-[#0c2f10]"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-semibold text-[#0f3e17] text-sm">
                              {srv.price.toLocaleString("vi-VN")} đ
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleService(srv.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              srv.isActive
                                ? "bg-[#e1f4df] text-[#0f3e17] border border-[#efeeeb]"
                                : "bg-[#efeeeb] text-[#222222]/60"
                            }`}
                          >
                            {srv.isActive ? "Đang áp dụng" : "Tạm ngưng"}
                          </button>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(srv)}
                            className="p-1.5 rounded-[14px] text-[#222222]/60 hover:text-[#0f3e17] hover:bg-[#e1f4df]/40 transition-colors"
                            title="Sửa đơn giá"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Báo cáo Tổng hợp HĐQT */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-[#0f3e17]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fffefc] text-[#222222] rounded-[14px] max-w-2xl w-full p-8 border border-[#efeeeb] max-h-[90vh] overflow-y-auto">
            <div className="text-center border-b pb-4 border-[#efeeeb]">
              <div className="text-[#0f3e17] eyebrow">
                HỆ THỐNG PHÒNG KHÁM CHUYÊN KHOA PHỤC HỒI CHỨC NĂNG BÁC SĨ THANH SANG
              </div>
              <h2 className="text-xl font-display-serif text-[#0f3e17] uppercase mt-2 tracking-[-0.01em]">
                BÁO CÁO HIỆU SUẤT VẬN HÀNH & TÀI CHÍNH THÁNG 11/2026
              </h2>
              <p className="text-xs text-[#222222]/70 mt-0.5">
                Người lập báo cáo: {user?.name || "Trần Đình Kiên"} (Quản trị viên)
              </p>
            </div>

            <div className="my-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-[#e1f4df]/30 rounded-[14px] border border-[#efeeeb]">
                <div>
                  <span className="text-[#222222]/60">Tổng doanh thu thực tế:</span>
                  <div className="text-base font-semibold text-[#0f3e17]">385.000.000 đ (+18.5%)</div>
                </div>
                <div>
                  <span className="text-[#222222]/60">Tổng lượt tiếp đón & khám:</span>
                  <div className="text-base font-semibold text-[#0f3e17]">1.248 lượt bệnh nhân</div>
                </div>
                <div>
                  <span className="text-[#222222]/60">Tỷ lệ thanh toán PayOS VietQR:</span>
                  <div className="font-semibold text-[#0f3e17]">78% (Không dùng tiền mặt)</div>
                </div>
                <div>
                  <span className="text-[#222222]/60">Tỷ lệ phục hồi mục tiêu FIM:</span>
                  <div className="font-semibold text-[#0f3e17]">84.2% hoàn thành phác đồ</div>
                </div>
              </div>

              <div className="p-4 bg-[#fffefc] rounded-[14px] border border-[#efeeeb]">
                <div className="font-semibold text-[#0f3e17] mb-2">Phân bổ Doanh thu theo Dịch vụ:</div>
                <div className="space-y-1 text-[11px] text-[#222222]/80">
                  <div className="flex justify-between">
                    <span>• Tập Phục hồi chức năng sau Tai biến 1:1:</span>
                    <strong>161.700.000 đ (42%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• Vật lý trị liệu Điện xung / Sóng ngắn / Kéo giãn:</span>
                    <strong>107.800.000 đ (28%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• Khám & Lượng giá Ban đầu (FIM / ROM):</span>
                    <strong>69.300.000 đ (18%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• Đơn thuốc hỗ trợ điều trị:</span>
                    <strong>46.200.000 đ (12%)</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#e1f4df]/40 rounded-[14px] border border-[#efeeeb] text-[#0f3e17] text-[11px] leading-relaxed">
                <strong>Kết luận & Định hướng tháng 12:</strong> Phòng khám đã vận hành ổn định 4 buồng chức năng. Đề xuất tăng cường thêm 2 Kỹ thuật viên Vận động trị liệu ca chiều để giải tỏa hàng đợi sảnh chờ.
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-[#efeeeb]">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 border border-[#efeeeb] rounded-[14px] text-xs font-semibold hover:bg-[#efeeeb]/40 text-[#222222]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] rounded-[14px] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>In Báo cáo HĐQT</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
