"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DoorOpen,
  Play,
  SkipForward,
  Stethoscope,
  ClipboardList,
  RefreshCw,
  PhoneCall,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import {
  receptionistService,
  RoomItem,
} from "@/services/receptionist.service";
import {
  roomService,
  RoomQueue,
  TherapyQueueItem,
  ExamQueueItem,
  TherapyStatus,
  getApiErrorMessage,
} from "@/services/room.service";

const PHCN_SPECIALTY = "Phục hồi chức năng";

const THERAPY_STATUS_LABEL: Record<string, string> = {
  WAITING: "Đang chờ",
  PREPARING: "Chuẩn bị vào",
  SERVING: "Đang phục vụ",
  WAITING_RESULT: "Chờ ghi kết quả",
  RETURNING: "Gọi lại",
  COMPLETED: "Hoàn thành",
  SKIPPED: "Đã bỏ qua",
  CANCELLED: "Đã hủy",
  NOT_STARTED: "Chưa bắt đầu",
  PENDING: "Chờ xử lý",
  RESCHEDULED: "Hẹn lại",
};

const THERAPY_STATUS_STYLE: Record<string, string> = {
  WAITING: "bg-amber-100 text-amber-800",
  PREPARING: "bg-blue-100 text-blue-800",
  SERVING: "bg-green-100 text-green-800",
  WAITING_RESULT: "bg-purple-100 text-purple-800",
  RETURNING: "bg-cyan-100 text-cyan-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  SKIPPED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-700",
  NOT_STARTED: "bg-gray-100 text-gray-600",
  PENDING: "bg-gray-100 text-gray-600",
  RESCHEDULED: "bg-orange-100 text-orange-800",
};

function fmtTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function RoomWorkspacePage() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket("/counters", true);

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [queue, setQueue] = useState<RoomQueue | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string>("");

  // Form ghi kết quả (quyết định 6.6: chỉ text tự do + ghi chú, thang điểm vào GĐ3).
  const [resultTarget, setResultTarget] = useState<TherapyQueueItem | null>(null);
  const [resultLines, setResultLines] = useState<string[]>([""]);
  const [resultNote, setResultNote] = useState("");
  const [resultSaving, setResultSaving] = useState(false);

  // Quyền thao tác: DOCTOR mọi nút; TECHNICIAN chỉ dịch vụ gán cho mình;
  // RECEPTIONIST/ADMIN chỉ xem (theo thiết kế §4.4.1).
  const role = user?.role ?? "";
  const myDoctorId = (user as unknown as { doctor?: { id: string } } | null)?.doctor?.id ?? "";
  const myTechnicianId = (user as unknown as { technician?: { id: string } } | null)?.technician?.id ?? "";
  const canAct = role === "DOCTOR" || role === "TECHNICIAN";
  const canActOn = (item: TherapyQueueItem) => {
    if (role === "DOCTOR") return true;
    if (role === "TECHNICIAN") return item.technicianId === myTechnicianId;
    return false;
  };

  const visibleRooms = showAllRooms
    ? rooms
    : rooms.filter((r) => r.specialtyName === PHCN_SPECIALTY);

  const fetchRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError("");
    try {
      const list = await receptionistService.getRooms();
      setRooms(list);
      // Mặc định: phòng của ca làm việc của người đăng nhập (booth có
      // doctorId trùng user); không khớp thì phòng PHCN đầu tiên.
      const mine = list.find((r) =>
        r.booths?.some((b) => b.doctorId && b.doctorId === myDoctorId),
      );
      const phcnFirst = list.find((r) => r.specialtyName === PHCN_SPECIALTY);
      const pick = mine ?? phcnFirst ?? list[0];
      if (pick) setSelectedRoomId(pick.id);
    } catch (err: unknown) {
      setRoomsError(getApiErrorMessage(err, "Không tải được danh sách phòng."));
    } finally {
      setRoomsLoading(false);
    }
  }, [myDoctorId]);

  const fetchQueue = useCallback(async (roomId: string, silent = false) => {
    if (!roomId) return;
    if (!silent) setQueueLoading(true);
    setQueueError("");
    try {
      const data = await roomService.getRoomQueue(roomId);
      setQueue(data);
    } catch (err: unknown) {
      setQueueError(getApiErrorMessage(err, "Không tải được hàng đợi phòng."));
    } finally {
      if (!silent) setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (selectedRoomId) fetchQueue(selectedRoomId);
  }, [selectedRoomId, fetchQueue]);

  // Đồng bộ: poll 15s + nghe WS broadcast (lễ tân chuyển phòng, bác sĩ/KTV
  // gọi bệnh nhân) rồi tải lại hàng đợi.
  const selectedRoomRef = useRef(selectedRoomId);
  selectedRoomRef.current = selectedRoomId;
  const fetchQueueRef = useRef(fetchQueue);
  fetchQueueRef.current = fetchQueue;
  useEffect(() => {
    const id = setInterval(() => {
      if (selectedRoomRef.current) fetchQueueRef.current(selectedRoomRef.current, true);
    }, 15000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!socket || !isConnected) return;
    const onBroadcast = (msg: any) => {
      if (
        msg?.type === "NEW_PRESCRIPTION_PATIENT" ||
        msg?.type === "PATIENT_CALLED_TO_ROOM" ||
        msg?.type === "PATIENT_STATUS_CHANGED"
      ) {
        if (selectedRoomRef.current) fetchQueueRef.current(selectedRoomRef.current, true);
      }
    };
    socket.on("broadcast", onBroadcast);
    return () => {
      socket.off("broadcast", onBroadcast);
    };
  }, [socket, isConnected]);

  const clearMsg = () => {
    setActionMsg("");
    setActionError("");
  };

  const runAction = async (key: string, fn: () => Promise<string>) => {
    setBusyId(key);
    clearMsg();
    try {
      const msg = await fn();
      setActionMsg(msg);
      if (selectedRoomId) await fetchQueue(selectedRoomId, true);
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, "Thao tác thất bại."));
    } finally {
      setBusyId("");
    }
  };

  const hasServingTherapy = (queue?.therapyQueue ?? []).some(
    (t) => t.status === "SERVING",
  );

  const confirmServingConflict = (item: TherapyQueueItem): boolean => {
    // Gọi/bắt đầu người mới trong khi đã có người SERVING sẽ làm mất kết
    // quả chưa ghi của người đang phục vụ — xác nhận trước (quyết định 6.2:
    // 1 người SERVING tại một thời điểm).
    if (!hasServingTherapy) return true;
    const serving = queue?.therapyQueue.find((t) => t.status === "SERVING");
    if (serving && serving.id === item.id) return true;
    return window.confirm(
      `Bệnh nhân ${serving?.patientName ?? ""} đang phục vụ sẽ được đánh dấu hoàn thành. Ghi kết quả cho người đang phục vụ trước nếu chưa ghi. Tiếp tục?`,
    );
  };

  const handleCallTherapy = (item: TherapyQueueItem) => {
    if (!confirmServingConflict(item)) return;
    void runAction(`call-${item.id}`, async () => {
      const res = await roomService.callPatient(item.id);
      if (!res.success) throw new Error(res.message || "Không gọi được bệnh nhân.");
      return res.message || `Đã gọi ${item.patientName} vào phòng.`;
    });
  };

  const handleStart = (item: TherapyQueueItem) => {
    if (!confirmServingConflict(item)) return;
    void runAction(`start-${item.id}`, async () => {
      await roomService.updateStatus(item.id, "SERVING", "Bắt đầu thực hiện dịch vụ");
      return `Đã bắt đầu ${item.serviceName} cho ${item.patientName}.`;
    });
  };

  const handleComplete = (item: TherapyQueueItem) =>
    runAction(`complete-${item.id}`, async () => {
      await roomService.updateStatus(item.id, "COMPLETED");
      return `Đã hoàn thành ${item.serviceName} cho ${item.patientName}.`;
    });

  const handleRecall = (item: TherapyQueueItem) =>
    runAction(`recall-${item.id}`, async () => {
      await roomService.updateStatus(item.id, "RETURNING");
      return `Đã đưa ${item.patientName} về trạng thái gọi lại.`;
    });

  const handleSkip = (item: TherapyQueueItem) => {
    if (!window.confirm(`Bỏ qua ${item.patientName} (${item.serviceName})?`)) return;
    void runAction(`skip-${item.id}`, async () => {
      await roomService.skipService(item.id);
      return `Đã bỏ qua ${item.patientName}.`;
    });
  };

  const handleCallExam = (item: ExamQueueItem) =>
    runAction(`exam-${item.appointmentCode}`, async () => {
      await roomService.callAppointment(selectedRoomId, item.appointmentCode);
      return `Đã gọi ${item.patientName} vào khám.`;
    });

  // Ghi kết quả: backend chỉ nhận results khi dịch vụ ở WAITING_RESULT,
  // nên gọi status WAITING_RESULT trước rồi mới gửi results (→ COMPLETED).
  const handleSubmitResults = async () => {
    if (!resultTarget) return;
    const lines = resultLines.map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) {
      setActionError("Nhập ít nhất một dòng kết quả.");
      return;
    }
    setResultSaving(true);
    clearMsg();
    try {
      if (resultTarget.status !== "WAITING_RESULT") {
        await roomService.updateStatus(resultTarget.id, "WAITING_RESULT");
      }
      await roomService.updateResults(
        resultTarget.id,
        lines,
        resultNote.trim() || undefined,
      );
      setActionMsg(`Đã ghi kết quả và hoàn thành ${resultTarget.serviceName} cho ${resultTarget.patientName}.`);
      setResultTarget(null);
      setResultLines([""]);
      setResultNote("");
      if (selectedRoomId) await fetchQueue(selectedRoomId, true);
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, "Ghi kết quả thất bại."));
    } finally {
      setResultSaving(false);
    }
  };

  const openResultForm = (item: TherapyQueueItem) => {
    setResultTarget(item);
    setResultLines([""]);
    setResultNote("");
    clearMsg();
  };

  const servingTherapy = queue?.therapyQueue.find((t) => t.status === "SERVING") ?? null;
  const waitingTherapy = (queue?.therapyQueue ?? []).filter((t) => t.status !== "SERVING");
  const servingExam = queue?.examQueue.find((e) => e.status === "SERVING") ?? null;
  const waitingExam = (queue?.examQueue ?? []).filter((e) => e.status !== "SERVING");

  const therapyButtons = (item: TherapyQueueItem) => {
    if (!canActOn(item)) return null;
    const busy = busyId !== "";
    const b = (key: string) => busyId === key;
    if (item.status === "WAITING" || item.status === "RETURNING") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => handleCallTherapy(item)}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <PhoneCall className="h-4 w-4" />
          {b(`call-${item.id}`) ? "Đang gọi..." : "Mời vào"}
        </button>
      );
    }
    // PREPARING (do call-next-patient đặt người kế tiếp): bấm "Bắt đầu" để
    // vào phục vụ thay vì gọi lại.
    if (item.status === "PREPARING") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => handleStart(item)}
          className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {b(`start-${item.id}`) ? "Đang bắt đầu..." : "Bắt đầu"}
        </button>
      );
    }
    if (item.status === "SERVING") {
      return (
        <span className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => openResultForm(item)}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <ClipboardList className="h-4 w-4" /> Ghi kết quả
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleComplete(item)}
            className="inline-flex items-center gap-1 rounded-md bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {b(`complete-${item.id}`) ? "Đang lưu..." : "Hoàn thành"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleSkip(item)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <SkipForward className="h-4 w-4" /> Bỏ qua
          </button>
        </span>
      );
    }
    if (item.status === "WAITING_RESULT") {
      return (
        <span className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => openResultForm(item)}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <ClipboardList className="h-4 w-4" /> Ghi kết quả
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleRecall(item)}
            className="inline-flex items-center gap-1 rounded-md border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {b(`recall-${item.id}`) ? "Đang xử lý..." : "Gọi lại"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleComplete(item)}
            className="inline-flex items-center gap-1 rounded-md bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Hoàn thành
          </button>
        </span>
      );
    }
    return null;
  };

  if (role && role !== "DOCTOR" && role !== "TECHNICIAN" && role !== "RECEPTIONIST" && role !== "ADMIN") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Tài khoản của bạn không có quyền xem màn hình phòng.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <DoorOpen className="h-6 w-6 text-blue-600" /> Màn hình phòng
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Hàng đợi khám và trị liệu của một phòng — tự làm mới mỗi 15 giây
            {isConnected ? " và khi có lệnh gọi mới" : " (mất kết nối thời gian thực, đang dùng poll)"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectedRoomId && fetchQueue(selectedRoomId)}
          disabled={!selectedRoomId || queueLoading}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" /> Tải lại
        </button>
      </div>

      {actionMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionMsg}</span>
          <button type="button" onClick={clearMsg} className="ml-auto" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
          <button type="button" onClick={clearMsg} className="ml-auto" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="room-select">
          Phòng
        </label>
        {roomsLoading ? (
          <p className="text-sm text-gray-500">Đang tải danh sách phòng...</p>
        ) : roomsError ? (
          <div className="space-y-2">
            <p className="text-sm text-red-600">{roomsError}</p>
            <button
              type="button"
              onClick={fetchRooms}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <select
              id="room-select"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="min-w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {visibleRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomName} ({r.roomCode})
                  {r.booths?.some((b) => b.doctorName) ? ` — BS. ${r.booths.find((b) => b.doctorName)?.doctorName}` : ""}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showAllRooms}
                onChange={(e) => setShowAllRooms(e.target.checked)}
              />
              Hiện tất cả phòng (mặc định chỉ phòng {PHCN_SPECIALTY})
            </label>
          </div>
        )}
      </div>

      {queueError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{queueError}</div>
      )}

      {queueLoading && !queue ? (
        <p className="text-sm text-gray-500">Đang tải hàng đợi phòng...</p>
      ) : queue ? (
        <div className="space-y-6">
          {/* Khối Chờ khám */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Stethoscope className="h-5 w-5 text-blue-600" /> Chờ khám
              <span className="text-sm font-normal text-gray-500">
                ({queue.examQueue.length} lịch hẹn hôm nay)
              </span>
            </h2>
            {servingExam && (
              <div className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Đang khám</p>
                <p className="mt-1 font-medium text-gray-900">
                  {servingExam.patientName}
                  {servingExam.serviceName ? ` — ${servingExam.serviceName}` : ""}
                </p>
                <p className="text-sm text-gray-600">
                  {servingExam.appointmentCode}
                  {servingExam.doctorName ? ` · BS. ${servingExam.doctorName}` : ""}
                  {servingExam.startTime ? ` · ${fmtTime(servingExam.startTime)}–${fmtTime(servingExam.endTime)}` : ""}
                </p>
              </div>
            )}
            {waitingExam.length === 0 && !servingExam ? (
              <p className="mt-3 text-sm text-gray-500">Không có lịch khám nào đang chờ ở phòng này.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {waitingExam.map((e) => (
                  <li key={e.appointmentCode} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {e.patientName}
                        {e.serviceName ? ` — ${e.serviceName}` : ""}
                      </p>
                      <p className="text-sm text-gray-600">
                        {e.appointmentCode}
                        {e.doctorName ? ` · BS. ${e.doctorName}` : ""}
                        {e.startTime ? ` · ${fmtTime(e.startTime)}–${fmtTime(e.endTime)}` : ""}
                      </p>
                    </div>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {e.status === "CONFIRMED" ? "Đã xác nhận" : e.status}
                      </span>
                      {canAct && e.status === "CONFIRMED" && (
                        <button
                          type="button"
                          disabled={busyId !== ""}
                          onClick={() => handleCallExam(e)}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          <PhoneCall className="h-4 w-4" />
                          {busyId === `exam-${e.appointmentCode}` ? "Đang gọi..." : "Mời vào"}
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Khối Chờ trị liệu */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Clock className="h-5 w-5 text-emerald-600" /> Chờ trị liệu
              <span className="text-sm font-normal text-gray-500">
                ({queue.therapyQueue.length} dịch vụ)
              </span>
            </h2>
            {servingTherapy && (
              <div className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Đang phục vụ</p>
                <p className="mt-1 font-medium text-gray-900">
                  {servingTherapy.patientName} — {servingTherapy.serviceName}
                </p>
                <p className="text-sm text-gray-600">
                  {servingTherapy.prescriptionCode}
                  {servingTherapy.doctorName ? ` · BS. ${servingTherapy.doctorName}` : ""}
                  {servingTherapy.technicianName ? ` · KTV. ${servingTherapy.technicianName}` : ""}
                  {servingTherapy.boothCode ? ` · ${servingTherapy.boothCode}` : ""}
                </p>
                <div className="mt-2">{therapyButtons(servingTherapy)}</div>
              </div>
            )}
            {waitingTherapy.length === 0 && !servingTherapy ? (
              <p className="mt-3 text-sm text-gray-500">Không có dịch vụ trị liệu nào đang chờ ở phòng này.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {waitingTherapy.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {t.patientName} — {t.serviceName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {t.prescriptionCode}
                        {t.doctorName ? ` · BS. ${t.doctorName}` : ""}
                        {t.technicianName ? ` · KTV. ${t.technicianName}` : ""}
                        {t.boothCode ? ` · ${t.boothCode}` : ""}
                      </p>
                    </div>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${THERAPY_STATUS_STYLE[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {THERAPY_STATUS_LABEL[t.status] ?? t.status}
                      </span>
                      {therapyButtons(t)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {/* Form ghi kết quả */}
      {resultTarget && (
        <div className="rounded-lg border border-emerald-300 bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
            Ghi kết quả — {resultTarget.patientName} ({resultTarget.serviceName})
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Mỗi dòng là một kết quả (VD: &quot;Tập gập gối 3x10, không đau&quot;). Thang điểm sẽ có ở GĐ3.
          </p>
          <div className="mt-3 space-y-2">
            {resultLines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={line}
                  onChange={(e) => {
                    const next = [...resultLines];
                    next[idx] = e.target.value;
                    setResultLines(next);
                  }}
                  placeholder={`Kết quả ${idx + 1}`}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                {resultLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setResultLines(resultLines.filter((_, i) => i !== idx))}
                    className="rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    aria-label="Xóa dòng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setResultLines([...resultLines, ""])}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              + Thêm dòng
            </button>
          </div>
          <label className="mt-3 block text-sm font-medium text-gray-700" htmlFor="result-note">
            Ghi chú
          </label>
          <textarea
            id="result-note"
            value={resultNote}
            onChange={(e) => setResultNote(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Ghi chú thêm (tùy chọn)"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={resultSaving}
              onClick={handleSubmitResults}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> {resultSaving ? "Đang lưu..." : "Lưu kết quả & hoàn thành"}
            </button>
            <button
              type="button"
              disabled={resultSaving}
              onClick={() => setResultTarget(null)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {!canAct && role && (
        <p className="text-sm text-gray-500">
          Tài khoản {role === "RECEPTIONIST" ? "lễ tân" : "quản trị"} chỉ xem hàng đợi, không bấm được nút gọi hay ghi kết quả.
        </p>
      )}
    </div>
  );
}
