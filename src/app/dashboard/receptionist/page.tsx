"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  QrCode,
  Search,
  CheckCircle2,
  Clock,
  UserPlus,
  Volume2,
  RotateCcw,
  SkipForward,
  Printer,
  AlertCircle,
  Check,
} from "lucide-react";
import { useAuth, REHAB_ROOMS } from "@/hooks/use-auth";
import {
  receptionistService,
  CounterItem,
  QueueSnapshot,
} from "@/services/receptionist.service";
import { appointmentService } from "@/services/appointment.service";
import { useQueueEvents } from "@/hooks/use-queue-events";

export default function ReceptionistWorkspacePage() {
  const { user } = useAuth();

  // Quầy tiếp nhận & Hàng đợi
  const [counters, setCounters] = useState<CounterItem[]>([]);
  const [activeCounterId, setActiveCounterId] = useState<string>("");
  const [queueData, setQueueData] = useState<QueueSnapshot | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [countersError, setCountersError] = useState("");
  const [queueError, setQueueError] = useState("");
  const [counterSessionError, setCounterSessionError] = useState("");

  // Tabs tiếp đón: 'APPOINTMENT' | 'WALK_IN'
  const [activeTab, setActiveTab] = useState<"APPOINTMENT" | "WALK_IN">("APPOINTMENT");

  // Tra cứu vé hẹn
  const [searchQuery, setSearchQuery] = useState("");
  const [foundAppointment, setFoundAppointment] = useState<any | null>(null);
  const [searchError, setSearchError] = useState("");

  // Form bệnh nhân vãng lai
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInBirthYear, setWalkInBirthYear] = useState<string>("1965");
  const [walkInService, setWalkInService] = useState("Kham-Luong-Gia");
  const [walkInIsDisabled, setWalkInIsDisabled] = useState(false);
  const [walkInIsElderly, setWalkInIsElderly] = useState(false);
  const [walkInIsPregnant, setWalkInIsPregnant] = useState(false);
  const [walkInIsVip, setWalkInIsVip] = useState(false);

  // Chỉ định buồng khám PHCN
  const [selectedDestRoom, setSelectedDestRoom] = useState("ROOM-101");
  const [transferSuccessMsg, setTransferSuccessMsg] = useState("");

  // Modal in phiếu tiếp nhận STT
  const [printedTicket, setPrintedTicket] = useState<any | null>(null);

  // Thông báo khi tài khoản đang đăng nhập không có quyền lễ tân (403).
  // Hay gặp khi trình duyệt đang giữ phiên của tài khoản bác sĩ/admin
  // (tên hiển thị có thể vẫn là "Lễ tân" do dữ liệu cũ) — cách xử lý duy
  // nhất là đăng xuất rồi đăng nhập lại bằng tài khoản lễ tân.
  const ROLE_ERROR_MESSAGE =
    "Tài khoản đang đăng nhập không có quyền lễ tân nên không mở được quầy. Đăng xuất rồi đăng nhập lại bằng tài khoản lễ tân (dakhoaquangnam@gmail.com).";

  // Mở quầy cho ca làm việc: backend chỉ cấp số khi có phiên phân công
  // ACTIVE của lễ tân đang đăng nhập (POST /take-number/take tự chọn quầy
  // theo phiên này, không nhận counterId từ frontend). Nếu mở quầy lỗi thì
  // báo rõ ngay ở đây, không để tới lúc cấp số mới lộ ra bằng lỗi 404.
  const openCounterSession = async (counterId: string) => {
    try {
      setCounterSessionError("");
      await receptionistService.openCounter(counterId);
      setActiveCounterId(counterId);
    } catch (err: any) {
      setCounterSessionError(
        err.response?.status === 403
          ? ROLE_ERROR_MESSAGE
          : err.response?.data?.message ||
              "Không mở được quầy tiếp nhận. Cấp số sẽ lỗi — kiểm tra lại rồi thử lại.",
      );
    }
  };

  // Load danh sách quầy — lỗi thì báo lỗi, không tự bịa quầy giả.
  const fetchCounters = async () => {
    try {
      setCountersError("");
      const data = await receptionistService.getCounters();
      setCounters(data);
      if (data.length === 0 || activeCounterId) return;
      // Kiểm tra phiên đang mở trước để không tạo phiên mới mỗi lần tải lại trang.
      try {
        const current = await receptionistService.getCurrentCounter();
        if (current?.counterId) {
          setActiveCounterId(current.counterId);
          return;
        }
      } catch (err: any) {
        // 403 = sai tài khoản (không có quyền lễ tân): mở quầy cũng sẽ 403,
        // báo rõ luôn thay vì thử mở rồi mới báo.
        if (err.response?.status === 403) {
          setCounterSessionError(ROLE_ERROR_MESSAGE);
          return;
        }
        // Lỗi khác thì thử mở quầy đầu tiên bên dưới.
      }
      await openCounterSession(data[0].counterId);
    } catch (err: any) {
      setCounters([]);
      setCountersError(
        err.response?.data?.message ||
          "Không tải được danh sách quầy. Kiểm tra kết nối backend rồi thử lại.",
      );
    }
  };

  // Load hàng đợi quầy — lỗi thì báo lỗi, không im lặng giữ dữ liệu cũ.
  const fetchQueue = async (counterId: string) => {
    if (!counterId) return;
    setIsLoadingQueue(true);
    try {
      setQueueError("");
      const data = await receptionistService.getQueueSnapshot(counterId);
      setQueueData(data);
    } catch (err: any) {
      setQueueError(
        err.response?.data?.message ||
          "Không tải được hàng đợi quầy. Vui lòng thử lại.",
      );
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchCounters();
  }, []);

  useEffect(() => {
    if (activeCounterId) {
      fetchQueue(activeCounterId);
    }
  }, [activeCounterId]);

  useQueueEvents(activeCounterId);

  const handleCallNext = async () => {
    if (!activeCounterId) {
      alert(
        "Chưa mở quầy nên chưa gọi được số. " +
          (counterSessionError ||
            "Tải lại trang để hệ thống tự mở quầy."),
      );
      return;
    }
    setActionLoading(true);
    try {
      await receptionistService.callNextPatient(activeCounterId);
      await fetchQueue(activeCounterId);
    } catch (err: any) {
      alert(
        "Lỗi khi gọi số: " +
          (err.response?.data?.message || err.message || "Vui lòng kiểm tra lại"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Gọi một bệnh nhân cụ thể trong danh sách chờ (không nhất thiết là
  // người đầu hàng). Bệnh nhân đó chuyển lên khung "Đang phục vụ tại quầy",
  // phần còn lại của danh sách vẫn hiển thị nguyên vẹn.
  const handleCallPatient = async (ticketId: string, queueNumber: string) => {
    if (!activeCounterId) {
      alert(
        "Chưa mở quầy nên chưa gọi được số. " +
          (counterSessionError ||
            "Tải lại trang để hệ thống tự mở quầy."),
      );
      return;
    }
    setActionLoading(true);
    try {
      const res = await receptionistService.callPatientByTicket(activeCounterId, ticketId);
      if (res?.message && !res?.patient && !res?.ok) {
        alert(res.message);
      }
      await fetchQueue(activeCounterId);
    } catch (err: any) {
      alert(
        `Lỗi khi gọi số ${queueNumber}: ` +
          (err.response?.data?.message || err.message || "Vui lòng kiểm tra lại"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!activeCounterId) {
      alert(
        "Chưa mở quầy nên chưa đánh dấu vắng được. " +
          (counterSessionError ||
            "Tải lại trang để hệ thống tự mở quầy."),
      );
      return;
    }
    setActionLoading(true);
    try {
      await receptionistService.skipCurrentPatient(activeCounterId);
      await fetchQueue(activeCounterId);
    } catch (err: any) {
      alert("Lỗi khi đánh dấu vắng: " + (err.message || ""));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!activeCounterId) {
      alert(
        "Chưa mở quầy nên chưa gọi lại được. " +
          (counterSessionError ||
            "Tải lại trang để hệ thống tự mở quầy."),
      );
      return;
    }
    setActionLoading(true);
    try {
      await receptionistService.rollbackPreviousPatient(activeCounterId);
      await fetchQueue(activeCounterId);
    } catch (err: any) {
      alert("Lỗi khi gọi lại: " + (err.message || ""));
    } finally {
      setActionLoading(false);
    }
  };

  // Tra cứu lịch hẹn theo mã thật trên backend.
  // Không tìm thấy thì báo lỗi — không tự bịa bệnh nhân.
  const handleSearchAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setFoundAppointment(null);

    const q = searchQuery.trim();
    if (!q) {
      setSearchError("Vui lòng nhập mã vé hẹn");
      return;
    }

    try {
      const apt = await appointmentService.getAppointmentByCode(q);
      const service = apt.services?.[0];
      setFoundAppointment({
        code: apt.appointmentCode,
        name: apt.patientProfile?.name ?? "",
        phone: apt.patientProfile?.phone ?? "",
        serviceName: service?.serviceName ?? "Khám PHCN",
        specialty: apt.specialtyName ?? "",
        timeSlot: `${String(apt.date ?? "").substring(0, 10)} (${apt.startTime} - ${apt.endTime})`,
        doctorName: apt.doctorName ?? "",
        profile: apt.patientProfile ?? null,
      });
    } catch (err: any) {
      setSearchError(
        err.response?.status === 404
          ? `Không tìm thấy lịch hẹn có mã ${q}. Kiểm tra lại mã vé (nên sao chép mã từ tin nhắn xác nhận thay vì gõ tay — có chữ trông giống hệt nhưng khác mã).`
          : err.response?.data?.message ||
              "Không tra cứu được lịch hẹn. Vui lòng thử lại.",
      );
    }
  };

  const handleCheckinAppointment = async () => {
    if (!foundAppointment) return;
    setActionLoading(true);
    try {
      // Ưu tiên lấy từ hồ sơ thật của lịch hẹn; không ghi cứng isDisabled.
      const profile = foundAppointment.profile ?? {};
      const dob = profile.dateOfBirth ? new Date(profile.dateOfBirth) : null;
      const age = dob
        ? new Date().getFullYear() - dob.getFullYear()
        : undefined;

      const res = await receptionistService.takeNumber({
        appointmentCode: foundAppointment.code,
        patientName: foundAppointment.name,
        patientPhone: foundAppointment.phone,
        patientAge: age,
        birthYear: dob ? dob.getFullYear() : undefined,
        isDisabled: Boolean(profile.isDisabled),
        isPregnant: Boolean(profile.isPregnant),
        isElderly: age != null ? age >= 75 : undefined,
      });

      if (!res?.ticket) {
        throw new Error("Backend không trả về số thứ tự. Vui lòng thử lại.");
      }
      const ticket = res.ticket;

      setPrintedTicket({
        ...ticket,
        counterName:
          counters.find((c) => c.counterId === activeCounterId)?.counterName ??
          ticket.counterName ??
          "",
        serviceName: foundAppointment.serviceName,
        roomName: "Phòng 101: Khám Lượng giá & Bác sĩ trưởng",
      });

      setFoundAppointment(null);
      setSearchQuery("");
      await fetchQueue(activeCounterId);
    } catch (err: any) {
      alert(
        "Đã xảy ra lỗi khi tạo vé: " +
          (err.response?.data?.message || err.message || "Vui lòng thử lại"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) {
      alert("Vui lòng nhập họ tên bệnh nhân");
      return;
    }

    setActionLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const birth = parseInt(walkInBirthYear, 10) || 1965;
      const age = currentYear - birth;

      const res = await receptionistService.takeNumber({
        patientName: walkInName.trim(),
        patientPhone: walkInPhone.trim(),
        birthYear: birth,
        patientAge: age,
        isDisabled: walkInIsDisabled,
        isElderly: walkInIsElderly || age >= 75,
        isPregnant: walkInIsPregnant,
        isVip: walkInIsVip,
      });

      if (!res?.ticket) {
        throw new Error("Backend không trả về số thứ tự. Vui lòng thử lại.");
      }
      const ticket = res.ticket;

      const selectedServiceName =
        walkInService === "Kham-Luong-Gia"
          ? "Khám lượng giá chức năng ban đầu"
          : walkInService === "Tai-Bien"
          ? "Tập phục hồi chức năng sau Tai biến"
          : walkInService === "Dien-Xung"
          ? "Vật lý trị liệu điện xung / Sóng ngắn"
          : "Kéo giãn cột sống thắt lưng / Cổ";

      setPrintedTicket({
        ...ticket,
        serviceName: selectedServiceName,
        roomName: "Sảnh chờ tiếp nhận • Bác sĩ Thanh Sang",
      });

      setWalkInName("");
      setWalkInPhone("");
      setWalkInIsDisabled(false);
      setWalkInIsElderly(false);
      setWalkInIsPregnant(false);
      setWalkInIsVip(false);

      await fetchQueue(activeCounterId);
    } catch (err: any) {
      alert(
        "Lỗi khi cấp số: " +
          (err.response?.data?.message || err.message || "Kiểm tra kết nối"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferToRoom = () => {
    const current = queueData?.current;
    if (!current) {
      alert("Hiện không có bệnh nhân nào đang phục vụ tại quầy để phân buồng.");
      return;
    }
    const roomObj = REHAB_ROOMS.find((r) => r.id === selectedDestRoom);
    // Ghi nhận tại quầy. Backend hiện chưa có endpoint đồng bộ phân buồng
    // lên màn hình buồng khám, nên không báo là "đã cập nhật".
    setTransferSuccessMsg(
      `Đã ghi nhận chuyển bệnh nhân ${current.patientName} (${current.queueNumber}) vào ${roomObj?.name}. Báo cho buồng khám qua bộ đàm/loa nội bộ.`,
    );
    setTimeout(() => {
      setTransferSuccessMsg("");
    }, 5000);
  };

  const currentPatient = queueData?.current;
  const waitingQueue = queueData?.queue || [];

  return (
    <div className="space-y-6 text-[#222222]">
      {/* Header Banner & Counter Selector */}
      <div className="bg-[#e1f4df] border border-[#cfe7d3] rounded-[14px] p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#fffefc] border border-[#cfe7d3] text-[#0f3e17] text-xs font-semibold mb-2">
            <Users className="w-4 h-4 text-[#0f3e17]" />
            <span>Phân hệ Lễ tân Tiếp đón</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f3e17] tracking-tight">
            Quầy Tiếp nhận & Phân luồng Người bệnh
          </h1>
          <p className="text-xs text-[#222222]/80 mt-1">
            Nhân viên ca trực: <strong className="text-[#0f3e17] font-bold">{user?.name || "Lê Hoàng Khang"}</strong> • Hệ thống tự động đồng bộ hàng đợi sảnh chờ
          </p>
        </div>

        {/* Counter Switcher */}
        <div className="flex flex-wrap items-center gap-2 bg-[#fffefc] p-1.5 rounded-[14px] border border-[#efeeeb]">
          <span className="text-xs text-[#222222]/60 px-2 font-medium hidden sm:inline">Quầy của bạn:</span>
          {counters.map((c) => (
            <button
              key={c.counterId}
              type="button"
              onClick={() => {
                if (c.counterId !== activeCounterId) {
                  void openCounterSession(c.counterId);
                }
              }}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors ${
                activeCounterId === c.counterId
                  ? "bg-[#0f3e17] text-[#fffefc]"
                  : "text-[#222222]/70 hover:text-[#0f3e17] hover:bg-[#e1f4df]/40"
              }`}
            >
              {c.counterCode} - {c.counterName.split("(")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left = Current Calling Desk, Right = Reception Forms */}
      {(countersError || queueError || counterSessionError) && (
        <div className="p-3.5 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{counterSessionError || countersError || queueError}</span>
          <button
            type="button"
            onClick={() => {
              fetchCounters();
              if (activeCounterId) fetchQueue(activeCounterId);
            }}
            className="ml-auto font-semibold underline"
          >
            Thử lại
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quầy gọi số & Bệnh nhân hiện tại */}
        <div className="lg:col-span-5 space-y-6">
          {/* Current Serving Box */}
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0f3e17] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0f3e17]" />
                Đang phục vụ tại quầy
              </span>
              <span className="text-xs text-[#222222]/60 font-medium">
                {counters.find((c) => c.counterId === activeCounterId)?.counterName || "Quầy Tiếp Nhận"}
              </span>
            </div>

            {currentPatient ? (
              <div className="space-y-4">
                <div className="text-center py-5 px-3 rounded-[14px] bg-[#e1f4df]/40 border border-[#cfe7d3]">
                  <div className="text-xs text-[#0f3e17] font-semibold">Số thứ tự tiếp nhận</div>
                  <div className="text-4xl sm:text-5xl font-black text-[#0f3e17] tracking-wider my-1 font-mono">
                    {currentPatient.queueNumber}
                  </div>
                  <div className="text-lg font-bold text-[#0f3e17] mt-1">
                    {currentPatient.patientName}
                  </div>
                  <div className="text-xs text-[#222222]/70 mt-1">
                    Tuổi: <strong className="text-[#0f3e17]">{currentPatient.patientAge || 58}</strong>
                    {currentPatient.isDisabled && (
                      <span className="ml-2 px-2 py-0.5 rounded-[6px] bg-[#b1dbb8]/40 text-[#0f3e17] text-[10px] font-semibold">
                        Khuyết tật / Liệt
                      </span>
                    )}
                    {currentPatient.isElderly && (
                      <span className="ml-2 px-2 py-0.5 rounded-[6px] bg-[#b6ced5]/30 text-[#0f3e17] text-[10px] font-semibold">
                        Người cao tuổi
                      </span>
                    )}
                  </div>
                </div>

                {/* Phân buồng khám PHCN cho bệnh nhân này */}
                <div className="p-4 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] space-y-2">
                  <label className="block text-xs font-semibold text-[#0f3e17]">
                    Chỉ định Buồng khám / Phòng Trị liệu PHCN:
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedDestRoom}
                      onChange={(e) => setSelectedDestRoom(e.target.value)}
                      className="flex-1 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] px-3 py-2 text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                    >
                      {REHAB_ROOMS.filter((r) => r.type !== "RECEPTION" && r.type !== "CASHIER").map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleTransferToRoom}
                      className="px-4 py-2 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold transition-colors"
                    >
                      Phân buồng
                    </button>
                  </div>
                  {transferSuccessMsg && (
                    <div className="p-2.5 rounded-[14px] bg-[#e1f4df] border border-[#cfe7d3] text-[#0f3e17] text-xs flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-[#0f3e17]" />
                      <span>{transferSuccessMsg}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 rounded-[14px] bg-[#fffefc] border border-dashed border-[#efeeeb] text-[#222222]/60">
                <Users className="w-10 h-10 mx-auto text-[#0f3e17]/40 mb-2" />
                <p className="text-xs">Quầy đang trống. Nhấn &quot;Gọi tiếp theo&quot; để mời bệnh nhân vào tiếp đón.</p>
              </div>
            )}

            {/* Action Buttons: Next / Skip / Rollback */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={handleCallNext}
                disabled={actionLoading}
                className="col-span-2 py-3 px-4 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Volume2 className="w-4 h-4" />
                <span>{actionLoading ? "Đang gọi..." : "Gọi tiếp theo"}</span>
              </button>

              <button
                type="button"
                onClick={handleSkip}
                disabled={actionLoading || !currentPatient}
                className="py-3 px-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#efeeeb]/40 text-[#222222] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                title="Bỏ qua ca vắng mặt"
              >
                <SkipForward className="w-4 h-4 text-[#0f3e17]" />
                <span>Vắng</span>
              </button>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={handleRollback}
                disabled={actionLoading}
                className="text-[11px] text-[#222222]/60 hover:text-[#0f3e17] inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Gọi lại bệnh nhân vừa khám</span>
              </button>
            </div>
          </div>

          {/* Realtime Waiting Queue */}
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f3e17] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0f3e17]" />
                <span>Danh sách đang đợi gọi số ({waitingQueue.length})</span>
              </h3>
              <span className="text-[11px] text-[#222222]/50">
                {isLoadingQueue ? "Đang cập nhật..." : "Đồng bộ WebSocket"}
              </span>
            </div>

            {waitingQueue.length === 0 ? (
              <div className="p-4 rounded-[14px] bg-[#e1f4df]/20 text-center text-xs text-[#222222]/60">
                Hiện không còn bệnh nhân nào trong hàng đợi quầy này.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {waitingQueue.map((item, idx) => (
                  <div
                    key={item.ticketId || idx}
                    className="p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-bold text-[#222222]/40">#{idx + 1}</span>
                      <div>
                        <div className="font-bold text-[#0f3e17] flex items-center gap-2">
                          <span className="font-mono text-[#0f3e17]">{item.queueNumber}</span>
                          <span>•</span>
                          <span>{item.patientName}</span>
                        </div>
                        <div className="text-[11px] text-[#222222]/60">
                          Tuổi: {item.patientAge}
                          {item.isDisabled && " • Khuyết tật / Liệt"}
                          {item.isElderly && " • Người cao tuổi"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.status === "PREPARING" ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-[6px] bg-[#e1f4df] text-[#0f3e17] font-semibold border border-[#cfe7d3]">
                          Đang chuẩn bị
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleCallPatient(item.ticketId, item.queueNumber)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-[8px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                          title={`Gọi ${item.patientName} (${item.queueNumber}) vào quầy`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Gọi</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tiếp đón & Check-in QR & Cấp số */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-6">
            {/* Mode Tabs */}
            <div className="flex flex-wrap border-b border-[#efeeeb] pb-3 mb-6 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("APPOINTMENT")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-colors ${
                  activeTab === "APPOINTMENT"
                    ? "bg-[#0f3e17] text-[#fffefc]"
                    : "text-[#222222]/70 hover:text-[#0f3e17] hover:bg-[#e1f4df]/40"
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>1. Tiếp đón Bệnh nhân có Hẹn trước (Check-in QR)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("WALK_IN")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold transition-colors ${
                  activeTab === "WALK_IN"
                    ? "bg-[#0f3e17] text-[#fffefc]"
                    : "text-[#222222]/70 hover:text-[#0f3e17] hover:bg-[#e1f4df]/40"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>2. Cấp số Bệnh nhân Vãng lai</span>
              </button>
            </div>

            {/* Tab 1: Check-in Lịch hẹn */}
            {activeTab === "APPOINTMENT" && (
              <div className="space-y-5">
                <form onSubmit={handleSearchAppointment} className="space-y-3">
                  <label className="block text-xs font-semibold text-[#0f3e17]">
                    Quét mã QR hoặc Nhập Mã vé hẹn / Số điện thoại bệnh nhân:
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#222222]/40">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Nhập mã vé APT-..."
                        className="w-full pl-10 pr-3.5 py-2.5 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-xs text-[#222222] placeholder-[#222222]/40 focus:outline-none focus:border-[#0f3e17]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold rounded-[14px] transition-colors"
                    >
                      Tra cứu
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#222222]/60">
                    <span>Gợi ý test nhanh:</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("RV-842")}
                      className="underline hover:text-[#0f3e17]"
                    >
                      RV-842
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("0912345678")}
                      className="underline hover:text-[#0f3e17]"
                    >
                      0912345678
                    </button>
                  </div>
                </form>

                {searchError && (
                  <div className="p-3.5 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{searchError}</span>
                  </div>
                )}

                {/* Kết quả tìm thấy lịch hẹn */}
                {foundAppointment && (
                  <div className="p-5 rounded-[14px] bg-[#e1f4df]/40 border border-[#cfe7d3] space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#cfe7d3]">
                      <div>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[7px] bg-[#0f3e17] text-[#fffefc]">
                          {foundAppointment.code}
                        </span>
                        <h4 className="text-base font-bold text-[#0f3e17] mt-1.5">
                          {foundAppointment.name}
                        </h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-[6px] bg-[#fffefc] text-[#0f3e17] border border-[#cfe7d3] text-xs font-semibold">
                        Đã đặt cọc qua PayOS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[#222222]/60">Dịch vụ PHCN:</span>
                        <div className="font-semibold text-[#0f3e17]">{foundAppointment.serviceName}</div>
                      </div>
                      <div>
                        <span className="text-[#222222]/60">Khung giờ hẹn:</span>
                        <div className="font-semibold text-[#0f3e17]">{foundAppointment.timeSlot}</div>
                      </div>
                      <div>
                        <span className="text-[#222222]/60">Bác sĩ chỉ định:</span>
                        <div className="font-semibold text-[#222222]">{foundAppointment.doctorName}</div>
                      </div>
                      <div>
                        <span className="text-[#222222]/60">Số điện thoại:</span>
                        <div className="font-semibold text-[#222222]">{foundAppointment.phone}</div>
                      </div>
                    </div>

                    {foundAppointment.symptoms && (
                      <div className="p-3 rounded-[14px] bg-[#fffefc] text-xs text-[#222222]/80 border border-[#cfe7d3]">
                        <strong className="text-[#0f3e17]">Lý do khám / Triệu chứng:</strong>{" "}
                        {foundAppointment.symptoms}
                      </div>
                    )}

                    <div className="pt-2 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setFoundAppointment(null)}
                        className="px-4 py-2 rounded-[14px] text-xs text-[#222222]/60 hover:text-[#0f3e17]"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleCheckinAppointment}
                        disabled={actionLoading}
                        className="px-6 py-2.5 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold transition-colors flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Xác nhận Check-in & Cấp số khám</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Tiếp đón Vãng lai */}
            {activeTab === "WALK_IN" && (
              <form onSubmit={handleWalkInSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Họ và tên Bệnh nhân *
                    </label>
                    <input
                      type="text"
                      required
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      placeholder="Ví dụ: Hoàng Minh Trí"
                      className="w-full px-3.5 py-2.5 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-xs text-[#222222] placeholder-[#222222]/40 focus:outline-none focus:border-[#0f3e17]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Số điện thoại liên hệ *
                    </label>
                    <input
                      type="tel"
                      required
                      value={walkInPhone}
                      onChange={(e) => setWalkInPhone(e.target.value)}
                      placeholder="09xx.xxx.xxx"
                      className="w-full px-3.5 py-2.5 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-xs text-[#222222] placeholder-[#222222]/40 focus:outline-none focus:border-[#0f3e17]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Năm sinh
                    </label>
                    <input
                      type="number"
                      min={1920}
                      max={2026}
                      value={walkInBirthYear}
                      onChange={(e) => setWalkInBirthYear(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Nhu cầu khám PHCN
                    </label>
                    <select
                      value={walkInService}
                      onChange={(e) => setWalkInService(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                    >
                      <option value="Kham-Luong-Gia">Khám Lượng giá chức năng ban đầu</option>
                      <option value="Tai-Bien">Phục hồi chức năng sau Tai biến 1:1</option>
                      <option value="Dien-Xung">Vật lý trị liệu Điện xung & Sóng ngắn</option>
                      <option value="Keo-Gian">Kéo giãn cột sống thắt lưng & Cổ</option>
                    </select>
                  </div>
                </div>

                {/* Sàng lọc tiêu chí ưu tiên PHCN */}
                <div className="p-4 rounded-[14px] bg-[#e1f4df]/30 border border-[#cfe7d3] space-y-2">
                  <span className="text-[11px] font-bold text-[#0f3e17] uppercase tracking-wider block">
                    Tiêu chí Ưu tiên Y tế & Phục hồi chức năng:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-[#222222]">
                      <input
                        type="checkbox"
                        checked={walkInIsDisabled}
                        onChange={(e) => setWalkInIsDisabled(e.target.checked)}
                        className="rounded border-[#cfe7d3] text-[#0f3e17] focus:ring-[#0f3e17]"
                      />
                      <span>Khuyết tật / Liệt</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[#222222]">
                      <input
                        type="checkbox"
                        checked={walkInIsElderly}
                        onChange={(e) => setWalkInIsElderly(e.target.checked)}
                        className="rounded border-[#cfe7d3] text-[#0f3e17] focus:ring-[#0f3e17]"
                      />
                      <span>Người già (≥ 75t)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[#222222]">
                      <input
                        type="checkbox"
                        checked={walkInIsPregnant}
                        onChange={(e) => setWalkInIsPregnant(e.target.checked)}
                        className="rounded border-[#cfe7d3] text-[#0f3e17] focus:ring-[#0f3e17]"
                      />
                      <span>Phụ nữ có thai</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[#222222]">
                      <input
                        type="checkbox"
                        checked={walkInIsVip}
                        onChange={(e) => setWalkInIsVip(e.target.checked)}
                        className="rounded border-[#cfe7d3] text-[#0f3e17] focus:ring-[#0f3e17]"
                      />
                      <span>Khám VIP</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold rounded-[14px] transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Cấp số thứ tự khám vãng lai</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Modal In Phiếu Tiếp Nhận STT Chuẩn K80 */}
      {printedTicket && (
        <div className="fixed inset-0 z-50 bg-[#0f3e17]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fffefc] text-[#222222] rounded-[14px] max-w-sm w-full p-6 border border-[#efeeeb] space-y-4">
            <div className="text-center border-b pb-3 border-[#efeeeb]">
              <div className="text-xs font-bold text-[#0f3e17] uppercase tracking-wide">
                PHÒNG KHÁM PHỤC HỒI CHỨC NĂNG BÁC SĨ THANH SANG
              </div>
              <div className="text-[11px] text-[#222222]/60">
                193 Quang Trung, Đại Lộc, Đà Nẵng • Hotline: 0369.117.117
              </div>
              <h3 className="text-base font-extrabold text-[#0f3e17] mt-2">
                PHIẾU TIẾP ĐÓN KHÁM BỆNH
              </h3>
            </div>

            <div className="my-4 text-center py-4 bg-[#e1f4df]/40 rounded-[14px] border border-[#cfe7d3]">
              <div className="text-xs text-[#0f3e17] font-semibold">SỐ THỨ TỰ CỦA BẠN</div>
              <div className="text-4xl font-black text-[#0f3e17] tracking-wider my-1 font-mono">
                {printedTicket.queueNumber}
              </div>
              <div className="text-xs font-semibold text-[#0f3e17]/80">
                {printedTicket.counterName || "Quầy Tiếp Nhận 1"}
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#222222] border-b pb-3 border-[#efeeeb]">
              <div className="flex justify-between">
                <span className="text-[#222222]/60">Họ và tên:</span>
                <strong className="text-[#0f3e17]">{printedTicket.patientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#222222]/60">Dịch vụ:</span>
                <span className="font-semibold text-right max-w-[180px] text-[#222222]">{printedTicket.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#222222]/60">Địa điểm:</span>
                <span className="font-semibold text-[#0f3e17]">{printedTicket.roomName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#222222]/60">Thời gian in:</span>
                <span>{new Date().toLocaleTimeString("vi-VN")} - 12/11/2026</span>
              </div>
            </div>

            <div className="text-center text-[11px] text-[#222222]/60 italic">
              * Quý khách vui lòng theo dõi màn hình TV sảnh chờ khi được gọi số.
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrintedTicket(null)}
                className="py-2.5 px-3 rounded-[14px] border border-[#efeeeb] text-xs font-semibold hover:bg-[#efeeeb]/40 text-[#222222]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="py-2.5 px-3 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>In phiếu K80</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
