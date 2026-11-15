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
import { useAuth } from "@/hooks/use-auth";
import {
  receptionistService,
  CounterItem,
  QueueSnapshot,
  RoomItem,
} from "@/services/receptionist.service";
import { appointmentService, normalizeAppointmentCode } from "@/services/appointment.service";
import { useQueueEvents } from "@/hooks/use-queue-events";

export default function ReceptionistWorkspacePage() {
  const { user } = useAuth();

  // Quầy tiếp nhận & Hàng đợi
  const [counters, setCounters] = useState<CounterItem[]>([]);
  const [activeCounterId, setActiveCounterId] = useState<string>("");
  const [queueData, setQueueData] = useState<QueueSnapshot | null>(null);
  // Bộ lọc danh sách chờ: "ALL" = tất cả quầy, hoặc 1 counterId cụ thể.
  const [queueFilter, setQueueFilter] = useState<string>("ALL");
  // Hàng đợi từng quầy khi xem "Tất cả quầy".
  const [allQueues, setAllQueues] = useState<Record<string, QueueSnapshot>>({});
  // Danh sách chỉ hiển thị theo ngày đang làm việc (vé hôm nay).
  // Ngày đọc trong useEffect (Next 16 cấm new Date() lúc render ở Client
  // Component vì giá trị sẽ đóng cứng lúc prerender).
  const [todayLabel, setTodayLabel] = useState("");
  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString("vi-VN"));
  }, []);
  const isTodayTicket = (t: { assignedAt?: string }) =>
    !!todayLabel &&
    !!t.assignedAt &&
    new Date(t.assignedAt).toLocaleDateString("vi-VN") === todayLabel;
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
  // GĐ4 — dị ứng thu ở form tiếp đón (Q7), lưu vào hồ sơ nếu tra được hồ sơ.
  const [walkInAllergies, setWalkInAllergies] = useState("");
  const [walkInService, setWalkInService] = useState("Kham-Luong-Gia");
  const [walkInIsDisabled, setWalkInIsDisabled] = useState(false);
  const [walkInIsElderly, setWalkInIsElderly] = useState(false);
  const [walkInIsPregnant, setWalkInIsPregnant] = useState(false);
  const [walkInIsVip, setWalkInIsVip] = useState(false);

  // Chỉ định buồng khám PHCN — phòng thật từ GET /routing/rooms (GĐ2),
  // không còn danh sách REHAB_ROOMS ghi cứng (ROOM-101... không khớp DB).
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState("");
  const [selectedDestRoom, setSelectedDestRoom] = useState("");
  const [transferSuccessMsg, setTransferSuccessMsg] = useState("");
  const [transferErrorMsg, setTransferErrorMsg] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  // Modal in phiếu tiếp nhận STT
  const [printedTicket, setPrintedTicket] = useState<any | null>(null);

  // Thông báo khi tài khoản đang đăng nhập không có quyền lễ tân/quản trị (403).
  // Hay gặp khi trình duyệt đang giữ phiên của tài khoản bác sĩ/thu ngân/
  // kỹ thuật viên — cách xử lý duy nhất là đăng xuất rồi đăng nhập lại bằng
  // tài khoản lễ tân hoặc quản trị.
  const ROLE_ERROR_MESSAGE =
    "Tài khoản đang đăng nhập không có quyền lễ tân/quản trị nên không mở được quầy. Đăng xuất rồi đăng nhập lại bằng tài khoản lễ tân (dakhoaquangnam@gmail.com) hoặc quản trị (dakhoaquangnam+admin@gmail.com).";

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

  // Load hàng đợi tất cả quầy (chế độ "Tất cả quầy"). Quầy nào lỗi thì bỏ
  // qua quầy đó, không làm hỏng cả bảng.
  const fetchAllQueues = async (list: CounterItem[]) => {
    if (list.length === 0) return;
    setIsLoadingQueue(true);
    try {
      setQueueError("");
      const snaps = await Promise.all(
        list.map(async (c) => {
          try {
            return [c.counterId, await receptionistService.getQueueSnapshot(c.counterId)] as const;
          } catch {
            return [c.counterId, null] as const;
          }
        }),
      );
      const next: Record<string, QueueSnapshot> = {};
      snaps.forEach(([id, snap]) => {
        if (snap) next[id] = snap;
      });
      setAllQueues(next);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  // Tải lại đúng danh sách đang hiển thị (1 quầy hoặc tất cả quầy).
  const refreshDisplayedQueues = async () => {
    if (queueFilter === "ALL") {
      await fetchAllQueues(counters);
    } else if (queueFilter) {
      await fetchQueue(queueFilter);
    }
  };

  useEffect(() => {
    fetchCounters();
    fetchRooms();
  }, []);

  // Load danh sách phòng thật — lỗi thì báo lỗi, không tự bịa phòng giả.
  const fetchRooms = async () => {
    setRoomsLoading(true);
    try {
      setRoomsError("");
      const data = await receptionistService.getRooms();
      setRooms(data);
      if (data.length > 0) {
        setSelectedDestRoom((prev) =>
          prev && data.some((r) => r.id === prev) ? prev : data[0].id,
        );
      }
    } catch (err: any) {
      setRooms([]);
      setRoomsError(
        err.response?.data?.message ||
          "Không tải được danh sách phòng. Kiểm tra kết nối backend rồi thử lại.",
      );
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    if (counters.length === 0) return;
    if (queueFilter === "ALL") {
      void fetchAllQueues(counters);
    } else {
      void fetchQueue(queueFilter);
    }
  }, [queueFilter, counters.length]);

  // Đồng bộ trực tiếp: có lượt gọi mới qua WebSocket thì tải lại danh sách,
  // và tự cập nhật mỗi 20 giây để bắt vé mới từ kiosk hoặc quầy khác.
  const { latestCalledTicket } = useQueueEvents(activeCounterId);
  useEffect(() => {
    if (latestCalledTicket) {
      void refreshDisplayedQueues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestCalledTicket]);
  useEffect(() => {
    if (counters.length === 0) return;
    const t = setInterval(() => {
      void refreshDisplayedQueues();
    }, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueFilter, counters.length]);

  // Quầy có bệnh nhân đợi lâu nhất trong ngày (để "Gọi tiếp theo" ở chế độ
  // "Tất cả quầy" biết gọi ở quầy nào).
  function findEarliestWaitingCounter(): string | null {
    let best: { counterId: string; at: string } | null = null;
    for (const c of counters) {
      const snap = allQueues[c.counterId];
      for (const item of snap?.queue ?? []) {
        if (!isTodayTicket(item)) continue;
        if (!best || item.assignedAt < best.at) {
          best = { counterId: c.counterId, at: item.assignedAt };
        }
      }
    }
    return best?.counterId ?? null;
  }

  const handleCallNext = async () => {
    // Chế độ "Tất cả quầy": gọi ở quầy có bệnh nhân đợi lâu nhất hôm nay.
    let targetCounterId = activeCounterId;
    if (queueFilter === "ALL") {
      const earliest = findEarliestWaitingCounter();
      if (!earliest) {
        alert("Hiện không có bệnh nhân nào đang đợi ở quầy nào.");
        return;
      }
      targetCounterId = earliest;
    }
    if (!targetCounterId) {
      alert(
        "Chưa mở quầy nên chưa gọi được số. " +
          (counterSessionError ||
            "Tải lại trang để hệ thống tự mở quầy."),
      );
      return;
    }
    setActionLoading(true);
    try {
      await receptionistService.callNextPatient(targetCounterId);
      await refreshDisplayedQueues();
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
  const handleCallPatient = async (counterId: string, ticketId: string, queueNumber: string) => {
    if (!counterId) {
      alert(
        "Chưa mở quầy nên chưa gọi được số. " +
          (counterSessionError ||
            "Tải lại trang để hệ thống tự mở quầy."),
      );
      return;
    }
    setActionLoading(true);
    try {
      const res = await receptionistService.callPatientByTicket(counterId, ticketId);
      if (res?.message && !res?.patient && !res?.ok) {
        alert(res.message);
      }
      await refreshDisplayedQueues();
    } catch (err: any) {
      alert(
        `Lỗi khi gọi số ${queueNumber}: ` +
          (err.response?.data?.message || err.message || "Vui lòng kiểm tra lại"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Gọi lại bệnh nhân đang phục vụ ở quầy (bấm khi bệnh nhân chưa nghe/chưa
  // vào). Bệnh nhân vẫn ở khung "Đang phục vụ", nút Gọi lại chuyển xanh lá
  // nhạt và không biến mất để gọi lại được nhiều lần.
  const handleRecallCurrent = async (counterId: string, queueNumber: string) => {
    if (!counterId) return;
    setActionLoading(true);
    try {
      const res = await receptionistService.recallCurrentPatient(counterId);
      if (res?.message && !res?.patient) {
        alert(res.message);
      }
      await refreshDisplayedQueues();
    } catch (err: any) {
      alert(
        `Lỗi khi gọi lại số ${queueNumber}: ` +
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
      await refreshDisplayedQueues();
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
      await refreshDisplayedQueues();
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
        doctorId: apt.doctorId ?? "",
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
        counterCode: "CTR003",
      });

      if (!res?.ticket) {
        throw new Error("Backend không trả về số thứ tự. Vui lòng thử lại.");
      }
      const ticket = res.ticket;

      setPrintedTicket({
        ...ticket,
        counterName:
          ticket.counterName ??
          counters.find((c) => c.counterId === activeCounterId)?.counterName ??
          "",
        serviceName: foundAppointment.serviceName,
        // GĐ2 bước 6 — phòng thật của bác sĩ trong lịch hẹn (tra từ danh
        // sách phòng đã tải), thay cho tên phòng ghi cứng "Phòng 101...".
        // Không tra được thì để trống, không in tên phòng sai lên vé.
        roomName:
          rooms.find((r) =>
            r.booths?.some((b) => b.doctorId === foundAppointment.doctorId),
          )?.roomName ?? "",
      });

      setFoundAppointment(null);
      setSearchQuery("");
      await refreshDisplayedQueues();
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
        allergies: walkInAllergies.trim() || undefined,
        patientAge: age,
        isDisabled: walkInIsDisabled,
        isElderly: walkInIsElderly || age >= 75,
        isPregnant: walkInIsPregnant,
        isVip: walkInIsVip,
        counterCode: walkInIsVip ? "CTR001" : "CTR002",
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

      await refreshDisplayedQueues();
    } catch (err: any) {
      alert(
        "Lỗi khi cấp số: " +
          (err.response?.data?.message || err.message || "Kiểm tra kết nối"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  // GĐ2 §4.4.2 — Chuyển bệnh nhân đang phục vụ ở quầy vào phòng thật qua
  // POST /routing/transfer. Backend tự lấy phiếu chỉ định từ lịch hẹn.
  // Bệnh nhân vãng lai (không có appointmentCode) chưa chuyển được vì vé
  // quầy không mang theo dịch vụ — báo rõ thay vì "thành công giả".
  const handleTransferToRoom = async () => {
    // Bệnh nhân đang phục vụ ở quầy của bạn (đọc từ state, đúng cả khi xem
    // "Tất cả quầy" vì khung phục vụ luôn gắn với quầy đang trực).
    const servingSnap = queueFilter === "ALL" ? allQueues[activeCounterId] ?? null : queueData;
    const current = servingSnap?.current && isTodayTicket(servingSnap.current)
      ? servingSnap.current
      : null;
    if (!current) {
      alert("Hiện không có bệnh nhân nào đang phục vụ tại quầy để phân buồng.");
      return;
    }
    if (!selectedDestRoom) {
      alert("Chưa chọn phòng. Tải lại danh sách phòng rồi chọn một phòng.");
      return;
    }
    if (!current.appointmentCode) {
      setTransferErrorMsg(
        `Bệnh nhân ${current.patientName} (${current.queueNumber}) là vãng lai, chưa có lịch hẹn nên chưa biết chuyển vào phòng nào với dịch vụ gì. Tạo lịch hẹn cho bệnh nhân rồi gọi lại, hoặc để bác sĩ chỉ định dịch vụ trước.`,
      );
      setTransferSuccessMsg("");
      return;
    }
    setTransferLoading(true);
    setTransferErrorMsg("");
    setTransferSuccessMsg("");
    try {
      const res = await receptionistService.transferToRoom({
        appointmentCode: normalizeAppointmentCode(current.appointmentCode),
        roomId: selectedDestRoom,
      });
      const staff = res.doctorName
        ? `BS. ${res.doctorName}`
        : res.technicianName
          ? `KTV. ${res.technicianName}`
          : "chưa có nhân viên trực";
      setTransferSuccessMsg(
        `Đã chuyển ${res.patientName} (${current.queueNumber}) vào ${res.roomName}` +
          (res.boothCode ? ` — ${res.boothCode}` : "") +
          ` (${staff}). Mã phiếu: ${res.prescriptionCode}.`,
      );
      setTimeout(() => {
        setTransferSuccessMsg("");
      }, 8000);
    } catch (err: any) {
      setTransferErrorMsg(
        "Không chuyển được vào phòng: " +
          (err.response?.data?.message || err.message || "Kiểm tra kết nối"),
      );
    } finally {
      setTransferLoading(false);
    }
  };

  // Bệnh nhân đang phục vụ ở quầy của bạn (chỉ tính vé hôm nay).
  const servingSnapshot = queueFilter === "ALL" ? allQueues[activeCounterId] ?? null : queueData;
  const currentPatient =
    servingSnapshot?.current && isTodayTicket(servingSnapshot.current)
      ? servingSnapshot.current
      : null;
  // Nhóm hàng đợi hiển thị: "Tất cả" -> từng quầy; 1 quầy -> quầy đó.
  // Mỗi nhóm giữ bệnh nhân đang phục vụ (để gọi lại) + danh sách đợi hôm nay.
  const queueGroups = (queueFilter === "ALL"
    ? counters
    : counters.filter((c) => c.counterId === queueFilter)
  ).map((c) => {
    const snap = queueFilter === "ALL" ? allQueues[c.counterId] ?? null : queueData;
    return {
      counter: c,
      current:
        snap?.current && isTodayTicket(snap.current) ? snap.current : null,
      waiting: (snap?.queue ?? []).filter((t) => isTodayTicket(t)),
    };
  });
  const waitingQueue = queueGroups.flatMap((g) => g.waiting);

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

        {/* Counter Switcher: danh sách sổ xuống — Tất cả quầy hoặc 1 quầy.
            Chọn 1 quầy = trực quầy đó (mở phiên phân công); chọn Tất cả =
            xem hàng đợi cả 3 quầy, quầy trực giữ nguyên. */}
        <div className="flex items-center gap-2 bg-[#fffefc] p-1.5 rounded-[14px] border border-[#efeeeb]">
          <span className="text-xs text-[#222222]/60 px-2 font-medium hidden sm:inline">Quầy của bạn:</span>
          <select
            value={queueFilter}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "ALL") {
                setQueueFilter("ALL");
              } else {
                if (v !== activeCounterId) {
                  void openCounterSession(v);
                }
                setQueueFilter(v);
              }
            }}
            className="bg-[#fffefc] border border-[#efeeeb] rounded-[8px] px-3 py-1.5 text-xs font-bold text-[#0f3e17] focus:outline-none focus:border-[#0f3e17]"
          >
            <option value="ALL">Tất cả quầy</option>
            {counters.map((c) => (
              <option key={c.counterId} value={c.counterId}>
                {c.counterCode} - {c.counterName}
              </option>
            ))}
          </select>
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
              void refreshDisplayedQueues();
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
                  {roomsError ? (
                    <div className="p-2.5 rounded-[14px] bg-[#fdecea] border border-[#f5c6cb] text-[#721c24] text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{roomsError}</span>
                      <button
                        type="button"
                        onClick={fetchRooms}
                        className="ml-auto px-2 py-1 rounded-[8px] bg-[#fffefc] border border-[#f5c6cb] text-[11px] font-semibold shrink-0"
                      >
                        Thử lại
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={selectedDestRoom}
                        onChange={(e) => setSelectedDestRoom(e.target.value)}
                        disabled={roomsLoading || rooms.length === 0}
                        className="flex-1 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] px-3 py-2 text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17] disabled:opacity-50"
                      >
                        {roomsLoading && (
                          <option value="">Đang tải danh sách phòng...</option>
                        )}
                        {!roomsLoading && rooms.length === 0 && (
                          <option value="">Không có phòng nào</option>
                        )}
                        {rooms.map((r) => {
                          const onDuty = r.booths
                            .map((b) => b.doctorName)
                            .find(Boolean);
                          return (
                            <option key={r.id} value={r.id}>
                              {r.roomName} ({r.roomCode})
                              {onDuty ? ` — BS. ${onDuty}` : ""}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        type="button"
                        onClick={handleTransferToRoom}
                        disabled={transferLoading || roomsLoading || rooms.length === 0}
                        className="px-4 py-2 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {transferLoading ? "Đang chuyển..." : "Phân buồng"}
                      </button>
                    </div>
                  )}
                  {transferSuccessMsg && (
                    <div className="p-2.5 rounded-[14px] bg-[#e1f4df] border border-[#cfe7d3] text-[#0f3e17] text-xs flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-[#0f3e17]" />
                      <span>{transferSuccessMsg}</span>
                    </div>
                  )}
                  {transferErrorMsg && (
                    <div className="p-2.5 rounded-[14px] bg-[#fdecea] border border-[#f5c6cb] text-[#721c24] text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{transferErrorMsg}</span>
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
                {isLoadingQueue ? "Đang cập nhật..." : "Đồng bộ WebSocket • cập nhật 20 giây"}
              </span>
            </div>

            {waitingQueue.length === 0 && !queueGroups.some((g) => g.current) ? (
              <div className="p-4 rounded-[14px] bg-[#e1f4df]/20 text-center text-xs text-[#222222]/60">
                Hôm nay hiện không còn bệnh nhân nào trong hàng đợi
                {queueFilter === "ALL" ? " các quầy." : " quầy này."}
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {queueGroups.map((group) => {
                  const cur = group.current;
                  return (
                    <div key={group.counter.counterId} className="space-y-2">
                      {queueFilter === "ALL" && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-bold text-[#0f3e17] uppercase tracking-wider">
                            {group.counter.counterCode} - {group.counter.counterName}
                          </span>
                          <span className="text-[11px] text-[#222222]/50">
                            {group.waiting.length} đang đợi
                          </span>
                        </div>
                      )}
                      {/* Bệnh nhân đang phục vụ: giữ lại trong danh sách, nút Gọi
                          lại chuyển xanh lá nhạt để gọi lại khi chưa nghe thấy. */}
                      {cur && (
                        <div className="p-3 rounded-[14px] bg-[#e1f4df] border border-[#cfe7d3] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-center font-bold text-[#0f3e17]">
                              <Volume2 className="w-4 h-4 mx-auto" />
                            </span>
                            <div>
                              <div className="font-bold text-[#0f3e17] flex items-center gap-2">
                                <span className="font-mono text-[#0f3e17]">{cur.queueNumber}</span>
                                <span>•</span>
                                <span>{cur.patientName}</span>
                              </div>
                              <div className="text-[11px] text-[#0f3e17]/70">
                                Đang phục vụ • đã gọi {cur.callCount} lần
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleRecallCurrent(group.counter.counterId, cur.queueNumber)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-[8px] bg-[#b1dbb8] hover:bg-[#9ecfa8] text-[#0f3e17] text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50 flex-shrink-0"
                            title={`Gọi lại ${cur.patientName} (${cur.queueNumber})`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Gọi lại</span>
                          </button>
                        </div>
                      )}
                      {group.waiting.map((item, idx) => (
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
                                onClick={() => void handleCallPatient(group.counter.counterId, item.ticketId, item.queueNumber)}
                                disabled={actionLoading}
                                className={`px-3 py-1.5 rounded-[8px] text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50 ${
                                  item.callCount > 0
                                    ? "bg-[#b1dbb8] hover:bg-[#9ecfa8] text-[#0f3e17]"
                                    : "bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc]"
                                }`}
                                title={`Gọi ${item.patientName} (${item.queueNumber}) vào quầy`}
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>{item.callCount > 0 ? "Đã gọi • Gọi lại" : "Gọi"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
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
                      onClick={() => setSearchQuery("APT-1794743712935")}
                      className="underline hover:text-[#0f3e17]"
                    >
                      APT-1794743712935
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

                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Dị ứng thuốc / thức ăn (nếu có)
                    </label>
                    <input
                      type="text"
                      value={walkInAllergies}
                      onChange={(e) => setWalkInAllergies(e.target.value)}
                      placeholder="Ví dụ: Penicillin — nổi mề đay 2023 (để trống nếu không có)"
                      className="w-full px-3.5 py-2.5 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-xs text-[#222222] placeholder-[#222222]/40 focus:outline-none focus:border-[#0f3e17]"
                    />
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
