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
  UserPlus,
  Trash2,
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
import {
  therapyService,
  TherapySession,
  TherapyProgress,
  HomeExerciseLog,
  therapySessionVas,
  therapySessionDurationMin,
} from "@/services/therapy.service";
import {
  exerciseService,
  Exercise,
  ExercisePrescriptionRow,
} from "@/services/exercise.service";
import AssessmentTab from "@/components/doctor/assessment-tab";

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
  // Xanh lá + trắng theo DESIGN.md: Đang chờ = Keylime Wash + Forest Ink
  // (không dùng hổ phách — hổ phách chỉ giữ cho lỗi/cảnh báo).
  WAITING: "bg-[#e1f4df] text-[#0f3e17]",
  PREPARING: "bg-[#cfe7d3] text-[#0f3e17]",
  SERVING: "bg-[#e1f4df] text-[#0f3e17]",
  WAITING_RESULT: "bg-[#cfe7d3] text-[#0f3e17]",
  RETURNING: "bg-[#cfe7d3] text-[#0f3e17]",
  COMPLETED: "bg-[#efeeeb] text-[#222222]",
  SKIPPED: "bg-[#efeeeb] text-[#222222]/70",
  CANCELLED: "bg-red-100 text-red-700",
  NOT_STARTED: "bg-[#efeeeb] text-[#222222]",
  PENDING: "bg-[#efeeeb] text-[#222222]",
  RESCHEDULED: "bg-[#e1f4df] text-[#0f3e17]",
};

function fmtTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("vi-VN");
}

function fmtElapsed(startedAt: string, now: number): string {
  const ms = now - new Date(startedAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} phút`;
  return `${Math.floor(min / 60)} giờ ${min % 60} phút`;
}

// GĐ5 — khối mở rộng theo bệnh nhân: lịch sử buổi đã làm + nhật ký tự tập
// chờ duyệt (KTV/bác sĩ duyệt ngay tại màn hình phòng).
function PatientDetailPanel(props: {
  patientName: string;
  loading: boolean;
  sessions: TherapySession[];
  progress: TherapyProgress | null;
  pendingLogs: HomeExerciseLog[];
  canReview: boolean;
  reviewNotes: Record<string, string>;
  onReviewNoteChange: (id: string, value: string) => void;
  reviewBusyId: string;
  onReview: (log: HomeExerciseLog, status: "APPROVED" | "REJECTED") => void;
}) {
  const { patientName, loading, sessions, progress, pendingLogs } = props;
  if (loading) {
    return <p className="mt-2 text-sm text-[#222222]/60">Đang tải lịch sử buổi của {patientName}...</p>;
  }
  return (
    <div className="mt-2 space-y-3 rounded-[14px] border border-[#efeeeb] bg-[#efeeeb] p-3">
      <div>
        <p className="text-sm font-semibold text-[#222222]">
          Các buổi đã làm — {patientName}
          {progress ? ` (${progress.completedSessions}/${progress.totalSessions} buổi xong)` : ""}
        </p>
        {sessions.length === 0 ? (
          <p className="mt-1 text-sm text-[#222222]/60">Chưa có buổi trị liệu nào được ghi.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {sessions.map((s) => (
              <li key={s.id} className="text-sm text-[#222222]">
                <span className=" font-medium">{s.code}</span>
                {` · ${fmtDate(s.startedAt)} ${fmtTime(s.startedAt)}`}
                {s.services?.length
                  ? ` · ${(s.services.map((x) => x.serviceName ?? "").filter(Boolean)).join(", ")}`
                  : ""}
                {s.performedByName ? ` · ${s.performedByName}` : ""}
                {therapySessionDurationMin(s) != null ? ` · ${therapySessionDurationMin(s)} phút` : ""}
                {therapySessionVas(s.painBefore) != null || therapySessionVas(s.painAfter) != null
                  ? ` · VAS ${therapySessionVas(s.painBefore) ?? "—"} → ${therapySessionVas(s.painAfter) ?? "—"}`
                  : ""}
                {` · ${s.exercises?.length ?? 0} bài đã làm`}
                {` · ${s.status === "COMPLETED" ? "Đã xong" : s.status === "CANCELLED" ? "Đã hủy" : "Đang làm"}`}
              </li>
            ))}
          </ul>
        )}
        {progress && progress.goalsDue.length > 0 && (
          <p className="mt-1 rounded-[14px] border border-amber-300 bg-amber-50 px-2 py-1 text-sm text-amber-800">
            Đã đủ số buổi — nên đánh giá lại:{" "}
            {progress.goalsDue.map((g) => g.scaleNameVi ?? g.scaleCode).join(", ")}.
          </p>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#222222]">
          Nhật ký tự tập chờ duyệt ({pendingLogs.length})
        </p>
        {pendingLogs.length === 0 ? (
          <p className="mt-1 text-sm text-[#222222]/60">Không có nhật ký tự tập nào đang chờ duyệt.</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {pendingLogs.map((log) => (
              <li key={log.id} className="rounded-[14px] border border-[#efeeeb] bg-[#fffefc] p-2 text-sm">
                <p className="text-[#222222]">
                  <span className=" font-medium">{log.code ?? ""}</span>
                  {` · ${fmtDate(log.loggedDate ?? log.createdAt)}`}
                  {` · ${log.exerciseName ?? "Bài tập"}`}
                  {log.setsDone != null ? ` · ${log.setsDone} hiệp` : ""}
                  {log.repsDone != null ? ` · ${log.repsDone} lần` : ""}
                  {log.painDuring != null ? ` · đau ${log.painDuring}/10` : ""}
                  {log.completed === false ? " · bỏ dở" : ""}
                </p>
                {log.note && <p className="text-[#222222]/70">Ghi chú: {log.note}</p>}
                {props.canReview && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={props.reviewNotes[log.id] ?? ""}
                      onChange={(e) => props.onReviewNoteChange(log.id, e.target.value)}
                      placeholder="Ghi chú duyệt"
                      className="min-w-48 flex-1 rounded-[14px] border border-[#efeeeb] px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      disabled={props.reviewBusyId !== ""}
                      onClick={() => props.onReview(log, "APPROVED")}
                      className="rounded-[14px] bg-[#0f3e17] px-2 py-1 text-xs font-medium text-[#fffefc] hover:bg-[#0c2f10] disabled:opacity-50"
                    >
                      {props.reviewBusyId === `APPROVED-${log.id}` ? "Đang duyệt..." : "Duyệt"}
                    </button>
                    <button
                      type="button"
                      disabled={props.reviewBusyId !== ""}
                      onClick={() => props.onReview(log, "REJECTED")}
                      className="rounded-[14px] border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {props.reviewBusyId === `REJECTED-${log.id}` ? "Đang xử lý..." : "Từ chối"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
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

  // GĐ5 — buổi trị liệu: buổi đang chạy theo từng dịch vụ (map theo
  // PrescriptionService id), form bắt đầu/kết thúc buổi, nhắc đánh giá lại.
  const [sessionsByService, setSessionsByService] = useState<Record<string, TherapySession>>({});
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [startTarget, setStartTarget] = useState<TherapyQueueItem | null>(null);
  const [startSelectedIds, setStartSelectedIds] = useState<string[]>([]);
  const [startPainBefore, setStartPainBefore] = useState("");
  const [startSaving, setStartSaving] = useState(false);
  const [finishTarget, setFinishTarget] = useState<{
    item: TherapyQueueItem;
    session: TherapySession;
  } | null>(null);
  const [finishLoading, setFinishLoading] = useState(false);
  const [finishPainAfter, setFinishPainAfter] = useState("");
  const [finishNotes, setFinishNotes] = useState("");
  const [finishStoppedEarly, setFinishStoppedEarly] = useState(false);
  const [finishAdverseEvent, setFinishAdverseEvent] = useState("");
  const [finishSaving, setFinishSaving] = useState(false);
  // Bài trong đơn ACTIVE của bệnh nhân đang kết thúc buổi + bài ngoài đơn.
  const [finishPrescriptions, setFinishPrescriptions] = useState<ExercisePrescriptionRow[]>([]);
  const [finishTicked, setFinishTicked] = useState<
    Record<string, { setsDone: string; repsDone: string; painDuring: string; completed: boolean; note: string }>
  >({});
  const [extraSearch, setExtraSearch] = useState("");
  const [extraResults, setExtraResults] = useState<Exercise[]>([]);
  const [extraSearching, setExtraSearching] = useState(false);
  const [extraPicked, setExtraPicked] = useState<Exercise[]>([]);
  // Banner nhắc đánh giá lại sau khi kết thúc 1 buổi (GĐ5 §3, Q4: 5 buổi).
  const [reassessBanner, setReassessBanner] = useState<{
    patientProfileId: string;
    patientName: string;
    sessionId: string;
    goalsDue: TherapyProgress["goalsDue"];
  } | null>(null);
  const [showReassessForm, setShowReassessForm] = useState(false);
  // Lịch sử buổi + nhật ký tự tập chờ duyệt của 1 bệnh nhân (mở theo dòng).
  const [expandedPatientId, setExpandedPatientId] = useState("");
  const [expandedSessions, setExpandedSessions] = useState<TherapySession[]>([]);
  const [expandedProgress, setExpandedProgress] = useState<TherapyProgress | null>(null);
  const [expandedPendingLogs, setExpandedPendingLogs] = useState<HomeExerciseLog[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewBusyId, setReviewBusyId] = useState("");

  // Quyền thao tác: DOCTOR mọi nút; TECHNICIAN chỉ dịch vụ gán cho mình;
  // RECEPTIONIST/ADMIN chỉ xem (theo thiết kế §4.4.1).
  const role = user?.role ?? "";
  const myDoctorId = (user as unknown as { doctor?: { id: string } } | null)?.doctor?.id ?? "";
  const myTechnicianId = (user as unknown as { technician?: { id: string } } | null)?.technician?.id ?? "";
  const canAct = role === "DOCTOR" || role === "TECHNICIAN";
  const canActOn = (item: TherapyQueueItem) => {
    if (role === "DOCTOR") return true;
    if (role === "TECHNICIAN") {
      // GĐ5 Q6: dịch vụ chưa có người gán thì KTV trực được bấm "Nhận".
      if (!item.doctorId && !item.technicianId) return true;
      return item.technicianId === myTechnicianId;
    }
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

  // GĐ5 — đếm thời gian buổi đang chạy (làm mới mỗi 30 giây).
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // GĐ5 — tải buổi đang chạy của các dịch vụ SERVING (để hiện thẻ buổi).
  const servingIdsKey = (queue?.therapyQueue ?? [])
    .filter((t) => t.status === "SERVING")
    .map((t) => t.id)
    .sort()
    .join(",");
  useEffect(() => {
    if (!servingIdsKey) return;
    let cancelled = false;
    const ids = servingIdsKey.split(",");
    Promise.all(
      ids.map(async (id) => {
        try {
          const list = await therapyService.getServiceSessions(id);
          const open = list.find((s) => s.status === "IN_PROGRESS") ?? list[0];
          return open ? ([id, open] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, TherapySession> = {};
      for (const p of pairs) if (p) next[p[0]] = p[1];
      setSessionsByService((prev) => ({ ...prev, ...next }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servingIdsKey]);
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

  // GĐ5 Q1 — "Bắt đầu" mở form chọn dịch vụ: 1 buổi gồm NHIỀU dịch vụ
  // WAITING của cùng 1 bệnh nhân (mặc định tick dịch vụ đang bấm) + VAS
  // trước buổi tùy chọn (Q3). Chỉ tạo buổi xong mới đổi trạng thái.
  const openStartForm = (item: TherapyQueueItem) => {
    setStartTarget(item);
    setStartSelectedIds([item.id]);
    setStartPainBefore("");
    clearMsg();
  };

  const toggleStartService = (id: string) => {
    setStartSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmitStart = async () => {
    if (!startTarget || startSelectedIds.length === 0) return;
    if (!confirmServingConflict(startTarget)) return;
    const painBefore =
      startPainBefore.trim() === "" ? undefined : Number(startPainBefore);
    if (painBefore !== undefined && (Number.isNaN(painBefore) || painBefore < 0 || painBefore > 10)) {
      setActionError("VAS trước buổi phải từ 0 đến 10 (hoặc để trống).");
      return;
    }
    setStartSaving(true);
    clearMsg();
    try {
      // 1. Tạo buổi trước — lỗi thì KHÔNG đổi trạng thái (tránh buổi ma).
      const session = await therapyService.startSession({
        prescriptionServiceIds: startSelectedIds,
        painBefore,
      });
      // 2. Mới đổi từng dịch vụ sang SERVING (bỏ qua dịch vụ nào backend
      // đã tự chuyển SERVING khi tạo buổi).
      const startedServices = Array.isArray(session.services) ? session.services : [];
      for (const id of startSelectedIds) {
        const svc = startedServices.find((s) => s.id === id);
        if (svc && svc.status === "SERVING") continue;
        try {
          await roomService.updateStatus(id, "SERVING", "Bắt đầu thực hiện dịch vụ");
        } catch (err: unknown) {
          // Buổi đã tạo nhưng đổi trạng thái 1 dịch vụ lỗi: báo rõ, không
          // giấu — buổi vẫn có thể kết thúc từ thẻ buổi đang chạy.
          setActionError(
            `Đã tạo buổi ${session.code} nhưng chưa chuyển được 1 dịch vụ sang phục vụ: ${getApiErrorMessage(err, "")}`,
          );
        }
      }
      setSessionsByService((prev) => {
        const next = { ...prev };
        for (const id of startSelectedIds) next[id] = session;
        return next;
      });
      setActionMsg(
        `Đã bắt đầu buổi ${session.code} (${startSelectedIds.length} dịch vụ) cho ${startTarget.patientName}.`,
      );
      setStartTarget(null);
      setStartSelectedIds([]);
      if (selectedRoomId) await fetchQueue(selectedRoomId, true);
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, "Không bắt đầu được buổi trị liệu."));
    } finally {
      setStartSaving(false);
    }
  };

  // GĐ5 — mở form kết thúc buổi. Dịch vụ đã SERVING mà chưa có buổi (VD:
  // được gọi thẳng vào phục vụ) thì tạo buổi ngay lúc này rồi mới mở form.
  const openFinishForm = async (item: TherapyQueueItem) => {
    setFinishLoading(true);
    clearMsg();
    try {
      let session = sessionsByService[item.id];
      if (!session || session.status !== "IN_PROGRESS") {
        const list = await therapyService.getServiceSessions(item.id);
        session = list.find((s) => s.status === "IN_PROGRESS") ?? list[0];
      }
      if (!session) {
        session = await therapyService.startSession({
          prescriptionServiceIds: [item.id],
        });
        setSessionsByService((prev) => ({ ...prev, [item.id]: session as TherapySession }));
      }
      const prescriptions = await exerciseService
        .listPatientExercisePrescriptions(item.patientProfileId, { status: "ACTIVE", limit: 50 })
        .then((r) => r.data)
        .catch(() => []);
      setFinishPrescriptions(prescriptions);
      // Mặc định không tick bài nào — KTV chỉ tick bài đã làm thật trong
      // buổi (tránh ghi khống cả đơn vào buổi).
      setFinishTicked({});
      setExtraPicked([]);
      setExtraSearch("");
      setExtraResults([]);
      setFinishPainAfter("");
      setFinishNotes("");
      setFinishStoppedEarly(false);
      setFinishAdverseEvent("");
      setFinishTarget({ item, session });
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, "Không mở được form kết thúc buổi."));
    } finally {
      setFinishLoading(false);
    }
  };

  const handleSearchExtraExercise = async () => {
    const q = extraSearch.trim();
    if (q.length < 2) return;
    setExtraSearching(true);
    try {
      const res = await exerciseService.listExercises({ search: q, limit: 10 });
      setExtraResults(res.data);
    } catch {
      setExtraResults([]);
    } finally {
      setExtraSearching(false);
    }
  };

  // GĐ5 — kết thúc buổi: ghi từng bài đã tick rồi PATCH finish → dịch vụ
  // sang WAITING_RESULT → form "Ghi kết quả" như cũ hiện ra.
  const handleSubmitFinish = async () => {
    if (!finishTarget) return;
    const { item, session } = finishTarget;
    const painAfter =
      finishPainAfter.trim() === "" ? undefined : Number(finishPainAfter);
    if (painAfter !== undefined && (Number.isNaN(painAfter) || painAfter < 0 || painAfter > 10)) {
      setActionError("VAS sau buổi phải từ 0 đến 10 (hoặc để trống).");
      return;
    }
    if (finishStoppedEarly && !finishAdverseEvent.trim()) {
      setActionError("Đã tick dừng sớm / có sự cố thì nhập rõ sự cố đã xảy ra.");
      return;
    }
    setFinishSaving(true);
    clearMsg();
    try {
      // Ghi bài trong đơn đã tick.
      for (const p of finishPrescriptions) {
        const row = finishTicked[`rx:${p.id}`];
        if (!row) continue;
        // Bài tick nhưng bỏ dở vẫn ghi (completed=false) để có dấu vết.
        await therapyService.addSessionExercise(session.id, {
          exercisePrescriptionId: p.id,
          exerciseId: p.exerciseId,
          setsDone: row.setsDone.trim() === "" ? undefined : Number(row.setsDone),
          repsDone: row.repsDone.trim() === "" ? undefined : Number(row.repsDone),
          painDuring: row.painDuring.trim() === "" ? undefined : Number(row.painDuring),
          completed: row.completed,
          note: row.note.trim() || undefined,
        });
      }
      // Bài ngoài đơn (không có exercisePrescriptionId — hiện rõ khi duyệt).
      for (const ex of extraPicked) {
        const row = finishTicked[`ex:${ex.id}`];
        if (!row) continue;
        await therapyService.addSessionExercise(session.id, {
          exerciseId: ex.id,
          setsDone: row.setsDone.trim() === "" ? undefined : Number(row.setsDone),
          repsDone: row.repsDone.trim() === "" ? undefined : Number(row.repsDone),
          painDuring: row.painDuring.trim() === "" ? undefined : Number(row.painDuring),
          completed: row.completed,
          note: row.note.trim() || undefined,
        });
      }
      await therapyService.finishSession(session.id, {
        painAfter,
        notes: finishNotes.trim() || undefined,
        adverseEvent: finishAdverseEvent.trim() || undefined,
        stoppedEarly: finishStoppedEarly,
      });
      setSessionsByService((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setFinishTarget(null);
      setActionMsg(`Đã kết thúc buổi ${session.code} cho ${item.patientName} — nhập kết quả để hoàn thành dịch vụ.`);
      if (selectedRoomId) await fetchQueue(selectedRoomId, true);
      // Mở form "Ghi kết quả" như cũ (dịch vụ nay ở WAITING_RESULT).
      setResultTarget({ ...item, status: "WAITING_RESULT" });
      setResultLines([""]);
      setResultNote("");
      // Nhắc đánh giá lại nếu bệnh nhân đã đủ số buổi (Q4: 5 buổi).
      try {
        const progress = await therapyService.getProgress(item.patientProfileId);
        if (progress.goalsDue.length > 0) {
          setReassessBanner({
            patientProfileId: item.patientProfileId,
            patientName: item.patientName,
            sessionId: session.id,
            goalsDue: progress.goalsDue,
          });
        }
      } catch {
        // Không tải được tiến độ thì chỉ mất banner nhắc, không chặn luồng.
      }
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, "Kết thúc buổi thất bại."));
    } finally {
      setFinishSaving(false);
    }
  };

  // GĐ5 — mở/đóng khối "Các buổi đã làm" + nhật ký tự tập chờ duyệt của 1
  // bệnh nhân (đọc từ GET /therapy-sessions/patient/:id và
  // GET /home-exercise-logs/patient/:id?status=PENDING).
  const togglePatientDetail = async (item: TherapyQueueItem) => {
    if (expandedPatientId === item.patientProfileId) {
      setExpandedPatientId("");
      return;
    }
    setExpandedPatientId(item.patientProfileId);
    setExpandedLoading(true);
    try {
      const [sessions, progress, logs] = await Promise.all([
        therapyService.getPatientSessions(item.patientProfileId).catch(() => [] as TherapySession[]),
        therapyService.getProgress(item.patientProfileId).catch(() => null),
        therapyService
          .getPatientHomeLogs(item.patientProfileId, { status: "PENDING" })
          .catch(() => [] as HomeExerciseLog[]),
      ]);
      setExpandedSessions(sessions);
      setExpandedProgress(progress);
      setExpandedPendingLogs(logs);
    } finally {
      setExpandedLoading(false);
    }
  };

  const handleReviewLog = async (log: HomeExerciseLog, status: "APPROVED" | "REJECTED") => {
    setReviewBusyId(`${status}-${log.id}`);
    clearMsg();
    try {
      await therapyService.reviewHomeLog(log.id, {
        status,
        reviewNote: reviewNotes[log.id]?.trim() || undefined,
      });
      setExpandedPendingLogs((prev) => prev.filter((l) => l.id !== log.id));
      setActionMsg(
        status === "APPROVED"
          ? `Đã duyệt nhật ký tự tập ${log.code ?? ""}.`
          : `Đã từ chối nhật ký tự tập ${log.code ?? ""}.`,
      );
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, "Duyệt nhật ký thất bại."));
    } finally {
      setReviewBusyId("");
    }
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

  // Xóa dịch vụ khi bệnh nhân từ chối: chuyển sang CANCELLED — backend
  // loại CANCELLED khỏi hàng đợi phòng nên dòng biến mất ngay sau khi xóa.
  // Chỉ xóa dịch vụ chưa bắt đầu (WAITING/RETURNING/PREPARING); dịch vụ
  // đang phục vụ hoặc chờ ghi kết quả thì dùng "Bỏ qua"/"Hoàn thành".
  const handleDeleteTherapy = (item: TherapyQueueItem) => {
    if (
      !window.confirm(
        `Xóa dịch vụ ${item.serviceName} của ${item.patientName} (${item.prescriptionCode})? Bệnh nhân từ chối dịch vụ nên xóa khỏi hàng đợi.`,
      )
    )
      return;
    void runAction(`delete-${item.id}`, async () => {
      await roomService.updateStatus(item.id, "CANCELLED", "Bệnh nhân từ chối dịch vụ");
      return `Đã xóa ${item.serviceName} của ${item.patientName}.`;
    });
  };

  // Xóa lịch khám khi bệnh nhân từ chối: hủy lịch hẹn (PATCH .../cancel).
  // Chỉ bác sĩ phụ trách lịch đó mới hủy được (backend kiểm tra).
  const handleDeleteExam = (item: ExamQueueItem) => {
    if (
      !window.confirm(
        `Xóa lịch khám ${item.appointmentCode} của ${item.patientName}? Bệnh nhân từ chối khám nên hủy lịch hẹn.`,
      )
    )
      return;
    void runAction(`delete-exam-${item.appointmentCode}`, async () => {
      await roomService.cancelAppointment(item.id);
      return `Đã hủy lịch khám ${item.appointmentCode} của ${item.patientName}.`;
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
      // GĐ5 Q6: dịch vụ chưa có người gán thì hiện "Nhận" (gọi
      // call-patient như "Mời", backend gán luôn cho người đang trực).
      const unassigned = !item.doctorId && !item.technicianId;
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => handleCallTherapy(item)}
          className={`inline-flex items-center gap-1 rounded-[14px] px-3 py-1.5 text-sm font-medium text-[#fffefc] disabled:opacity-50 ${
            unassigned
              ? "bg-[#0c2f10] hover:bg-[#0f3e17]"
              : "bg-[#0f3e17] hover:bg-[#0c2f10]"
          }`}
        >
          {unassigned ? <UserPlus className="h-4 w-4" /> : <PhoneCall className="h-4 w-4" />}
          {b(`call-${item.id}`) ? "Đang xử lý..." : unassigned ? "Nhận" : "Mời vào"}
        </button>
      );
    }
    // PREPARING (do call-next-patient đặt người kế tiếp): bấm "Bắt đầu" để
    // mở form buổi trị liệu (GĐ5: tạo buổi trước, rồi mới vào phục vụ).
    if (item.status === "PREPARING") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => openStartForm(item)}
          className="inline-flex items-center gap-1 rounded-[14px] bg-[#0f3e17] px-3 py-1.5 text-sm font-medium text-[#fffefc] hover:bg-[#0c2f10] disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          Bắt đầu
        </button>
      );
    }
    if (item.status === "SERVING") {
      const session = sessionsByService[item.id];
      return (
        <span className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || finishLoading}
            onClick={() => void openFinishForm(item)}
            className="inline-flex items-center gap-1 rounded-[14px] bg-[#0f3e17] px-3 py-1.5 text-sm font-medium text-[#fffefc] hover:bg-[#0c2f10] disabled:opacity-50"
          >
            <ClipboardList className="h-4 w-4" />
            {finishLoading && finishTarget?.item.id === item.id
              ? "Đang mở..."
              : session
                ? `Kết thúc buổi ${session.code}`
                : "Kết thúc buổi"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => openResultForm(item)}
            className="inline-flex items-center gap-1 rounded-[14px] border border-[#efeeeb] px-3 py-1.5 text-sm font-medium text-[#0f3e17] hover:bg-[#e1f4df] disabled:opacity-50"
          >
            <ClipboardList className="h-4 w-4" /> Ghi kết quả
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleComplete(item)}
            className="inline-flex items-center gap-1 rounded-[14px] bg-[#222222] px-3 py-1.5 text-sm font-medium text-[#fffefc] hover:bg-[#0f3e17] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {b(`complete-${item.id}`) ? "Đang lưu..." : "Hoàn thành"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleSkip(item)}
            className="inline-flex items-center gap-1 rounded-[14px] border border-[#efeeeb] px-3 py-1.5 text-sm font-medium text-[#222222] hover:bg-[#efeeeb] disabled:opacity-50"
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
            className="inline-flex items-center gap-1 rounded-[14px] bg-[#0f3e17] px-3 py-1.5 text-sm font-medium text-[#fffefc] hover:bg-[#0c2f10] disabled:opacity-50"
          >
            <ClipboardList className="h-4 w-4" /> Ghi kết quả
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleRecall(item)}
            className="inline-flex items-center gap-1 rounded-[14px] border border-[#efeeeb] px-3 py-1.5 text-sm font-medium text-[#0f3e17] hover:bg-[#e1f4df] disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {b(`recall-${item.id}`) ? "Đang xử lý..." : "Gọi lại"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleComplete(item)}
            className="inline-flex items-center gap-1 rounded-[14px] bg-[#222222] px-3 py-1.5 text-sm font-medium text-[#fffefc] hover:bg-[#0f3e17] disabled:opacity-50"
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
      <div className="rounded-[14px] border border-red-200 bg-red-50 p-4 text-red-700">
        Tài khoản của bạn không có quyền xem màn hình phòng.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display-serif text-2xl text-[#0f3e17] tracking-[-0.01em]">
            <DoorOpen className="h-6 w-6 text-[#0f3e17]" /> Màn hình phòng
          </h1>
          <p className="mt-1 text-sm text-[#222222]/60">
            Hàng đợi khám và trị liệu của một phòng — tự làm mới mỗi 15 giây
            {isConnected ? " và khi có lệnh gọi mới" : " (mất kết nối thời gian thực, đang dùng poll)"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectedRoomId && fetchQueue(selectedRoomId)}
          disabled={!selectedRoomId || queueLoading}
          className="inline-flex items-center gap-1 rounded-[14px] border border-[#b1dbb8] px-3 py-2 text-sm font-medium text-[#0f3e17] hover:bg-[#e1f4df] disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" /> Tải lại
        </button>
      </div>

      {actionMsg && (
        <div className="flex items-start gap-2 rounded-[14px] bg-[#e1f4df] p-3 text-sm text-[#0f3e17]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionMsg}</span>
          <button type="button" onClick={clearMsg} className="ml-auto" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {actionError && (
        <div className="flex items-start gap-2 rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
          <button type="button" onClick={clearMsg} className="ml-auto" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-[14px] border border-[#efeeeb] bg-[#fffefc] p-7">
        <label className="mb-1 block text-sm font-medium text-[#222222]" htmlFor="room-select">
          Phòng
        </label>
        {roomsLoading ? (
          <p className="text-sm text-[#222222]/60">Đang tải danh sách phòng...</p>
        ) : roomsError ? (
          <div className="space-y-2">
            <p className="text-sm text-red-600">{roomsError}</p>
            <button
              type="button"
              onClick={fetchRooms}
              className="rounded-[14px] border border-[#efeeeb] px-3 py-1.5 text-sm hover:bg-[#efeeeb]"
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
              className="min-w-64 rounded-[14px] border border-[#efeeeb] px-3 py-2 text-sm"
            >
              {visibleRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomName} ({r.roomCode})
                  {r.booths?.some((b) => b.doctorName) ? ` — BS. ${r.booths.find((b) => b.doctorName)?.doctorName}` : ""}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-sm text-[#222222]/70">
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
        <div className="rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm text-red-700">{queueError}</div>
      )}

      {queueLoading && !queue ? (
        <p className="text-sm text-[#222222]/60">Đang tải hàng đợi phòng...</p>
      ) : queue ? (
        <div className="space-y-6">
          {/* Khối Chờ khám — dải tiêu đề xanh lá (Keylime Wash) + thân trắng */}
          <section className="overflow-hidden rounded-[14px] border border-[#efeeeb] bg-[#fffefc]">
            <div className="rounded-t-[14px] bg-[#e1f4df] px-7 py-3">
              <h2 className="flex items-center gap-2 font-display-serif text-lg text-[#0f3e17]">
                <Stethoscope className="h-5 w-5 text-[#0f3e17]" /> Chờ khám
                <span className="text-sm font-normal text-[#0f3e17]/70">
                  ({queue.examQueue.length} lịch hẹn hôm nay)
                </span>
              </h2>
            </div>
            <div className="p-7 pt-3">
            {servingExam && (
              <div className="mt-3 rounded-[14px] bg-[#e1f4df] p-3">
                <p className="eyebrow text-[#0f3e17]">Đang khám</p>
                <p className="mt-1 font-display-serif text-[#0f3e17]">
                  {servingExam.patientName}
                  {servingExam.serviceName ? ` — ${servingExam.serviceName}` : ""}
                </p>
                <p className="text-sm text-[#222222]/70">
                  {servingExam.appointmentCode}
                  {servingExam.doctorName ? ` · BS. ${servingExam.doctorName}` : ""}
                  {servingExam.startTime ? ` · ${fmtTime(servingExam.startTime)}–${fmtTime(servingExam.endTime)}` : ""}
                </p>
              </div>
            )}
            {waitingExam.length === 0 && !servingExam ? (
              <p className="mt-3 text-sm text-[#222222]/60">Không có lịch khám nào đang chờ ở phòng này.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[#efeeeb]">
                {waitingExam.map((e) => (
                  <li key={e.appointmentCode} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-display-serif text-[#0f3e17]">
                        {e.patientName}
                        {e.serviceName ? ` — ${e.serviceName}` : ""}
                      </p>
                      <p className="text-sm text-[#222222]/70">
                        {e.appointmentCode}
                        {e.doctorName ? ` · BS. ${e.doctorName}` : ""}
                        {e.startTime ? ` · ${fmtTime(e.startTime)}–${fmtTime(e.endTime)}` : ""}
                      </p>
                    </div>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-[#e1f4df] px-2 py-0.5 text-xs font-medium text-[#0f3e17]">
                        {e.status === "CONFIRMED" ? "Đã xác nhận" : e.status}
                      </span>
                      {canAct && e.status === "CONFIRMED" && (
                        <button
                          type="button"
                          disabled={busyId !== ""}
                          onClick={() => handleCallExam(e)}
                          className="inline-flex items-center gap-1 rounded-[14px] bg-[#0f3e17] px-3 py-1.5 text-sm font-medium text-[#fffefc] hover:bg-[#0c2f10] disabled:opacity-50"
                        >
                          <PhoneCall className="h-4 w-4" />
                          {busyId === `exam-${e.appointmentCode}` ? "Đang gọi..." : "Mời vào"}
                        </button>
                      )}
                      {role === "DOCTOR" && (!myDoctorId || e.doctorId === myDoctorId) && (
                        <button
                          type="button"
                          disabled={busyId !== ""}
                          onClick={() => handleDeleteExam(e)}
                          className="inline-flex items-center gap-1 rounded-[14px] border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          {busyId === `delete-exam-${e.appointmentCode}` ? "Đang xóa..." : "Xóa"}
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            </div>
          </section>

          {/* Khối Chờ trị liệu — dải tiêu đề xanh lá (Keylime Wash) + thân trắng */}
          <section className="overflow-hidden rounded-[14px] border border-[#efeeeb] bg-[#fffefc]">
            <div className="rounded-t-[14px] bg-[#e1f4df] px-7 py-3">
              <h2 className="flex items-center gap-2 font-display-serif text-lg text-[#0f3e17]">
                <Clock className="h-5 w-5 text-[#0f3e17]" /> Chờ trị liệu
                <span className="text-sm font-normal text-[#0f3e17]/70">
                  ({queue.therapyQueue.length} dịch vụ)
                </span>
              </h2>
            </div>
            <div className="p-7 pt-3">
            {servingTherapy && (
              <div className="mt-3 rounded-[14px] bg-[#e1f4df] p-3">
                <p className="eyebrow text-[#0f3e17]">Đang phục vụ</p>
                <p className="mt-1 font-display-serif text-[#0f3e17]">
                  {servingTherapy.patientName} — {servingTherapy.serviceName}
                </p>
                <p className="text-sm text-[#222222]/70">
                  {servingTherapy.prescriptionCode}
                  {servingTherapy.doctorName ? ` · BS. ${servingTherapy.doctorName}` : ""}
                  {servingTherapy.technicianName ? ` · KTV. ${servingTherapy.technicianName}` : ""}
                  {servingTherapy.boothCode ? ` · ${servingTherapy.boothCode}` : ""}
                </p>
                {/* GĐ5 — thẻ buổi đang chạy: mã buổi, người thực hiện, giờ bắt đầu, đếm thời gian. */}
                {sessionsByService[servingTherapy.id] && (
                  <p className="mt-1 text-sm text-[#0f3e17]">
                    Buổi <span className="font-semibold">{sessionsByService[servingTherapy.id].code}</span>
                    {sessionsByService[servingTherapy.id].performedByName
                      ? ` · ${sessionsByService[servingTherapy.id].performedByName}`
                      : ""}
                    {` · bắt đầu ${fmtTime(sessionsByService[servingTherapy.id].startedAt)} · đã ${fmtElapsed(sessionsByService[servingTherapy.id].startedAt, nowTick)}`}
                    {therapySessionVas(sessionsByService[servingTherapy.id].painBefore) != null
                      ? ` · VAS trước buổi: ${therapySessionVas(sessionsByService[servingTherapy.id].painBefore)}/10`
                      : ""}
                  </p>
                )}
                <div className="mt-2">{therapyButtons(servingTherapy)}</div>
              </div>
            )}
            {waitingTherapy.length === 0 && !servingTherapy ? (
              <p className="mt-3 text-sm text-[#222222]/60">Không có dịch vụ trị liệu nào đang chờ ở phòng này.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[#efeeeb]">
                {waitingTherapy.map((t) => (
                  <li key={t.id} className="py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-display-serif text-[#0f3e17]">
                          {t.patientName} — {t.serviceName}
                        </p>
                        <p className="text-sm text-[#222222]/70">
                          {t.prescriptionCode}
                          {t.doctorName ? ` · BS. ${t.doctorName}` : ""}
                          {t.technicianName ? ` · KTV. ${t.technicianName}` : ""}
                          {t.boothCode ? ` · ${t.boothCode}` : ""}
                        </p>
                      </div>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${THERAPY_STATUS_STYLE[t.status] ?? "bg-[#efeeeb] text-[#222222]"}`}>
                          {THERAPY_STATUS_LABEL[t.status] ?? t.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => void togglePatientDetail(t)}
                          className="rounded-[14px] border border-[#b1dbb8] px-2 py-1.5 text-xs font-medium text-[#0f3e17] hover:bg-[#e1f4df]"
                        >
                          {expandedPatientId === t.patientProfileId ? "Ẩn lịch sử buổi" : "Buổi đã làm"}
                        </button>
                        {therapyButtons(t)}
                        {(t.status === "WAITING" || t.status === "RETURNING" || t.status === "PREPARING") &&
                          canActOn(t) && (
                            <button
                              type="button"
                              disabled={busyId !== ""}
                              onClick={() => handleDeleteTherapy(t)}
                              className="inline-flex items-center gap-1 rounded-[14px] border border-red-300 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {busyId === `delete-${t.id}` ? "Đang xóa..." : "Xóa"}
                            </button>
                          )}
                      </span>
                    </div>
                    {expandedPatientId === t.patientProfileId && (
                      <PatientDetailPanel
                        patientName={t.patientName}
                        loading={expandedLoading}
                        sessions={expandedSessions}
                        progress={expandedProgress}
                        pendingLogs={expandedPendingLogs}
                        canReview={canAct}
                        reviewNotes={reviewNotes}
                        onReviewNoteChange={(id, v) =>
                          setReviewNotes((prev) => ({ ...prev, [id]: v }))
                        }
                        reviewBusyId={reviewBusyId}
                        onReview={handleReviewLog}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
            </div>
          </section>

          {/* GĐ5 — banner nhắc đánh giá lại (hiện sau khi kết thúc 1 buổi
              mà bệnh nhân đã đủ số buổi theo mục tiêu, mặc định 5 buổi). */}
          {reassessBanner && (
            <section className="rounded-[14px] border border-amber-300 bg-amber-50 p-7">
              <h2 className="flex items-center gap-2 font-display-serif text-base text-amber-900">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Đã đủ số buổi — nên đánh giá lại
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                {reassessBanner.patientName} đã đủ số buổi. Nên đánh giá lại:{" "}
                {reassessBanner.goalsDue
                  .map((g) => g.scaleNameVi ?? g.scaleCode)
                  .join(", ")}
                .
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowReassessForm((v) => !v)}
                  className="rounded-[14px] bg-amber-600 px-3 py-1.5 text-sm font-medium text-[#fffefc] hover:bg-amber-700"
                >
                  {showReassessForm ? "Ẩn form đánh giá" : "Đánh giá ngay"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReassessBanner(null);
                    setShowReassessForm(false);
                  }}
                  className="rounded-[14px] border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
                >
                  Để sau
                </button>
              </div>
              {showReassessForm && (
                <div className="mt-3 rounded-[14px] border border-amber-200 bg-[#fffefc] p-3">
                  <p className="mb-2 text-xs text-[#222222]/60">
                    Chấm ở thời điểm Tái đánh giá, gắn với buổi {""}
                    vừa xong — thang BS-only vẫn chỉ bác sĩ chấm (quyền GĐ3).
                  </p>
                  <AssessmentTab
                    patientProfileId={reassessBanner.patientProfileId}
                    defaultTimepoint="REASSESSMENT"
                    therapySessionId={reassessBanner.sessionId}
                    onAssessmentCreated={() => {
                      setReassessBanner(null);
                      setShowReassessForm(false);
                      setActionMsg("Đã lưu lần đánh giá lại.");
                    }}
                  />
                </div>
              )}
            </section>
          )}
        </div>
      ) : null}

      {/* GĐ5 — Form bắt đầu buổi: chọn nhiều dịch vụ WAITING của cùng 1
          bệnh nhân (Q1) + VAS trước buổi tùy chọn (Q3). */}
      {startTarget && (
        <div className="rounded-[14px] border border-[#efeeeb] bg-[#fffefc] p-7">
          <h3 className="flex items-center gap-2 font-display-serif text-base text-[#0f3e17]">
            <Play className="h-5 w-5 text-[#0f3e17]" />
            Bắt đầu buổi trị liệu — {startTarget.patientName}
          </h3>
          <p className="mt-1 text-sm text-[#222222]/60">
            1 buổi có thể gồm nhiều dịch vụ của cùng bệnh nhân. Buổi chỉ được tạo khi bấm
            &quot;Bắt đầu buổi&quot; — nếu tạo buổi lỗi thì dịch vụ không đổi trạng thái.
          </p>
          <div className="mt-3 space-y-2">
            {(queue?.therapyQueue ?? [])
              .filter(
                (t) =>
                  t.patientProfileId === startTarget.patientProfileId &&
                  (t.status === "WAITING" || t.status === "PREPARING"),
              )
              .map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm text-[#222222]">
                  <input
                    type="checkbox"
                    checked={startSelectedIds.includes(t.id)}
                    onChange={() => toggleStartService(t.id)}
                  />
                  <span>
                    {t.serviceName}
                    <span className="text-[#222222]/60">
                      {` (${THERAPY_STATUS_LABEL[t.status] ?? t.status})`}
                      {t.doctorName ? ` · BS. ${t.doctorName}` : ""}
                      {t.technicianName ? ` · KTV. ${t.technicianName}` : ""}
                    </span>
                  </span>
                </label>
              ))}
          </div>
          <label className="mt-3 block text-sm font-medium text-[#222222]" htmlFor="pain-before">
            Đau trước buổi (VAS 0–10, tùy chọn)
          </label>
          <input
            id="pain-before"
            type="number"
            min={0}
            max={10}
            value={startPainBefore}
            onChange={(e) => setStartPainBefore(e.target.value)}
            placeholder="Để trống nếu bệnh nhân không đau"
            className="mt-1 w-64 rounded-[14px] border border-[#efeeeb] px-3 py-2 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={startSaving || startSelectedIds.length === 0}
              onClick={handleSubmitStart}
              className="inline-flex items-center gap-1 rounded-[14px] bg-[#0f3e17] px-4 py-2 text-sm font-medium text-[#fffefc] hover:bg-[#0c2f10] disabled:opacity-50"
            >
              <Play className="h-4 w-4" /> {startSaving ? "Đang bắt đầu..." : `Bắt đầu buổi (${startSelectedIds.length} dịch vụ)`}
            </button>
            <button
              type="button"
              disabled={startSaving}
              onClick={() => setStartTarget(null)}
              className="rounded-[14px] border border-[#efeeeb] px-4 py-2 text-sm font-medium text-[#222222] hover:bg-[#efeeeb] disabled:opacity-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* GĐ5 — Form kết thúc buổi: VAS sau buổi (tùy chọn) + bài đã làm
          (tick từ đơn ACTIVE + thêm bài ngoài đơn) + ghi chú + sự cố. */}
      {finishTarget && (
        <div className="rounded-[14px] border border-[#efeeeb] bg-[#fffefc] p-7">
          <h3 className="flex items-center gap-2 font-display-serif text-base text-[#0f3e17]">
            <ClipboardList className="h-5 w-5 text-[#0f3e17]" />
            Kết thúc buổi {finishTarget.session.code} — {finishTarget.item.patientName} ({finishTarget.item.serviceName})
          </h3>
          <label className="mt-3 block text-sm font-medium text-[#222222]" htmlFor="pain-after">
            Đau sau buổi (VAS 0–10, tùy chọn)
          </label>
          <input
            id="pain-after"
            type="number"
            min={0}
            max={10}
            value={finishPainAfter}
            onChange={(e) => setFinishPainAfter(e.target.value)}
            placeholder="Để trống nếu không đo"
            className="mt-1 w-64 rounded-[14px] border border-[#efeeeb] px-3 py-2 text-sm"
          />

          <p className="mt-4 text-sm font-semibold text-[#222222]">Bài đã làm trong buổi</p>
          {finishPrescriptions.length === 0 ? (
            <p className="mt-1 text-sm text-[#222222]/60">
              Bệnh nhân chưa có đơn bài tập nào đang hiệu lực — chỉ ghi được bài ngoài đơn bên dưới.
            </p>
          ) : (
            <div className="mt-2 space-y-3">
              {finishPrescriptions.map((p) => {
                const key = `rx:${p.id}`;
                const row = finishTicked[key];
                return (
                  <div key={p.id} className="rounded-[14px] border border-[#efeeeb] p-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-[#222222]">
                      <input
                        type="checkbox"
                        checked={!!row}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFinishTicked((prev) => ({
                              ...prev,
                              [key]: {
                                setsDone: p.sets != null ? String(p.sets) : "",
                                repsDone: p.reps != null ? String(p.reps) : "",
                                painDuring: "",
                                completed: true,
                                note: "",
                              },
                            }));
                          } else {
                            setFinishTicked((prev) => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                          }
                        }}
                      />
                      {p.exercise?.name ?? "Bài tập"}
                      <span className="font-normal text-[#222222]/60">
                        {` — kê: ${[p.sets ? `${p.sets} hiệp` : "", p.reps ? `${p.reps} lần` : "", p.holdSec ? `giữ ${p.holdSec}s` : ""].filter(Boolean).join(" · ")}`}
                      </span>
                    </label>
                    {row && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <label className="flex items-center gap-1 text-[#222222]">
                          Hiệp thực tế
                          <input
                            type="number"
                            min={0}
                            value={row.setsDone}
                            onChange={(e) =>
                              setFinishTicked((prev) => ({ ...prev, [key]: { ...prev[key], setsDone: e.target.value } }))
                            }
                            className="w-16 rounded-[14px] border border-[#efeeeb] px-2 py-1"
                          />
                        </label>
                        <label className="flex items-center gap-1 text-[#222222]">
                          Lần/bài
                          <input
                            type="number"
                            min={0}
                            value={row.repsDone}
                            onChange={(e) =>
                              setFinishTicked((prev) => ({ ...prev, [key]: { ...prev[key], repsDone: e.target.value } }))
                            }
                            className="w-16 rounded-[14px] border border-[#efeeeb] px-2 py-1"
                          />
                        </label>
                        <label className="flex items-center gap-1 text-[#222222]">
                          Đau khi tập (0–10)
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={row.painDuring}
                            onChange={(e) =>
                              setFinishTicked((prev) => ({ ...prev, [key]: { ...prev[key], painDuring: e.target.value } }))
                            }
                            className="w-16 rounded-[14px] border border-[#efeeeb] px-2 py-1"
                          />
                        </label>
                        <label className="flex items-center gap-1 text-[#222222]">
                          <input
                            type="checkbox"
                            checked={!row.completed}
                            onChange={(e) =>
                              setFinishTicked((prev) => ({ ...prev, [key]: { ...prev[key], completed: !e.target.checked } }))
                            }
                          />
                          Bỏ dở bài này
                        </label>
                        <input
                          type="text"
                          value={row.note}
                          onChange={(e) =>
                            setFinishTicked((prev) => ({ ...prev, [key]: { ...prev[key], note: e.target.value } }))
                          }
                          placeholder="Ghi chú riêng bài này"
                          className="min-w-48 flex-1 rounded-[14px] border border-[#efeeeb] px-2 py-1"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bài ngoài đơn — hiện rõ là ngoài đơn khi bác sĩ duyệt buổi. */}
          <div className="mt-3 rounded-[14px] border border-dashed border-[#efeeeb] p-3">
            <p className="text-sm font-semibold text-[#222222]">Thêm bài ngoài đơn</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <input
                type="text"
                value={extraSearch}
                onChange={(e) => setExtraSearch(e.target.value)}
                placeholder="Tìm bài tập..."
                className="min-w-56 flex-1 rounded-[14px] border border-[#efeeeb] px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={extraSearching || extraSearch.trim().length < 2}
                onClick={handleSearchExtraExercise}
                className="rounded-[14px] border border-[#efeeeb] px-3 py-2 text-sm font-medium text-[#222222] hover:bg-[#efeeeb] disabled:opacity-50"
              >
                {extraSearching ? "Đang tìm..." : "Tìm bài"}
              </button>
            </div>
            {extraResults.length > 0 && (
              <ul className="mt-2 space-y-1">
                {extraResults.map((ex) => (
                  <li key={ex.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {ex.name}
                      <span className="text-[#222222]/60">{` (${ex.code})`}</span>
                    </span>
                    <button
                      type="button"
                      disabled={extraPicked.some((x) => x.id === ex.id)}
                      onClick={() => {
                        setExtraPicked((prev) => [...prev, ex]);
                        setFinishTicked((prev) => ({
                          ...prev,
                          [`ex:${ex.id}`]: { setsDone: "", repsDone: "", painDuring: "", completed: true, note: "" },
                        }));
                      }}
                      className="rounded-[14px] border border-[#efeeeb] px-2 py-1 text-xs font-medium text-[#222222] hover:bg-[#efeeeb] disabled:opacity-50"
                    >
                      {extraPicked.some((x) => x.id === ex.id) ? "Đã thêm" : "+ Thêm vào buổi"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {extraPicked.map((ex) => {
              const key = `ex:${ex.id}`;
              const row = finishTicked[key];
              if (!row) return null;
              return (
                <div key={ex.id} className="mt-2 rounded-[14px] border border-amber-200 bg-amber-50 p-2 text-sm">
                  <p className="font-medium text-amber-900">
                    {ex.name} <span className="font-normal text-amber-700">(bài ngoài đơn)</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-[#222222]">
                      Hiệp
                      <input
                        type="number"
                        min={0}
                        value={row.setsDone}
                        onChange={(e) =>
                          setFinishTicked((prev) => ({ ...prev, [key]: { ...prev[key], setsDone: e.target.value } }))
                        }
                        className="w-16 rounded-[14px] border border-[#efeeeb] px-2 py-1"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[#222222]">
                      Lần
                      <input
                        type="number"
                        min={0}
                        value={row.repsDone}
                        onChange={(e) =>
                          setFinishTicked((prev) => ({ ...prev, [key]: { ...prev[key], repsDone: e.target.value } }))
                        }
                        className="w-16 rounded-[14px] border border-[#efeeeb] px-2 py-1"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[#222222]">
                      Đau khi tập (0–10)
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={row.painDuring}
                        onChange={(e) =>
                          setFinishTicked((prev) => ({ ...prev, [key]: { ...prev[key], painDuring: e.target.value } }))
                        }
                        className="w-16 rounded-[14px] border border-[#efeeeb] px-2 py-1"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[#222222]">
                      <input
                        type="checkbox"
                        checked={!row.completed}
                        onChange={(e) =>
                          setFinishTicked((prev) => ({ ...prev, [key]: { ...prev[key], completed: !e.target.checked } }))
                        }
                      />
                      Bỏ dở bài này
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setExtraPicked((prev) => prev.filter((x) => x.id !== ex.id));
                        setFinishTicked((prev) => {
                          const next = { ...prev };
                          delete next[key];
                          return next;
                        });
                      }}
                      className="rounded-[14px] border border-[#efeeeb] px-2 py-1 text-xs text-[#222222]/70 hover:bg-[#fffefc]"
                    >
                      Gỡ bài
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <label className="mt-3 block text-sm font-medium text-[#222222]" htmlFor="finish-notes">
            Ghi chú buổi
          </label>
          <textarea
            id="finish-notes"
            value={finishNotes}
            onChange={(e) => setFinishNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-[14px] border border-[#efeeeb] px-3 py-2 text-sm"
            placeholder="Nhận xét chung về buổi tập"
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-[#222222]">
            <input
              type="checkbox"
              checked={finishStoppedEarly}
              onChange={(e) => setFinishStoppedEarly(e.target.checked)}
            />
            Dừng sớm / có sự cố trong buổi
          </label>
          {finishStoppedEarly && (
            <input
              type="text"
              value={finishAdverseEvent}
              onChange={(e) => setFinishAdverseEvent(e.target.value)}
              placeholder="Mô tả sự cố — bắt buộc khi đã tick"
              className="mt-1 w-full rounded-[14px] border border-[#efeeeb] px-3 py-2 text-sm"
            />
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={finishSaving}
              onClick={handleSubmitFinish}
              className="inline-flex items-center gap-1 rounded-[14px] bg-[#0f3e17] px-4 py-2 text-sm font-medium text-[#fffefc] hover:bg-[#0c2f10] disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> {finishSaving ? "Đang lưu..." : "Kết thúc buổi"}
            </button>
            <button
              type="button"
              disabled={finishSaving}
              onClick={() => setFinishTarget(null)}
              className="rounded-[14px] border border-[#efeeeb] px-4 py-2 text-sm font-medium text-[#222222] hover:bg-[#efeeeb] disabled:opacity-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Form ghi kết quả */}
      {resultTarget && (
        <div className="rounded-[14px] border border-[#efeeeb] bg-[#fffefc] p-7">
          <h3 className="flex items-center gap-2 font-display-serif text-base text-[#0f3e17]">
            <ClipboardList className="h-5 w-5 text-[#0f3e17]" />
            Ghi kết quả — {resultTarget.patientName} ({resultTarget.serviceName})
          </h3>
          <p className="mt-1 text-sm text-[#222222]/60">
            Mỗi dòng là một kết quả. Thang điểm sẽ có ở GĐ3.
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
                  className="flex-1 rounded-[14px] border border-[#efeeeb] px-3 py-2 text-sm"
                />
                {resultLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setResultLines(resultLines.filter((_, i) => i !== idx))}
                    className="rounded-[14px] border border-[#efeeeb] px-2 py-2 text-sm text-[#222222]/70 hover:bg-[#efeeeb]"
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
              className="rounded-[14px] border border-[#efeeeb] px-3 py-1.5 text-sm text-[#222222] hover:bg-[#efeeeb]"
            >
              + Thêm dòng
            </button>
          </div>
          <label className="mt-3 block text-sm font-medium text-[#222222]" htmlFor="result-note">
            Ghi chú
          </label>
          <textarea
            id="result-note"
            value={resultNote}
            onChange={(e) => setResultNote(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-[14px] border border-[#efeeeb] px-3 py-2 text-sm"
            placeholder="Ghi chú thêm"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={resultSaving}
              onClick={handleSubmitResults}
              className="inline-flex items-center gap-1 rounded-[14px] bg-[#0f3e17] px-4 py-2 text-sm font-medium text-[#fffefc] hover:bg-[#0c2f10] disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> {resultSaving ? "Đang lưu..." : "Lưu kết quả & hoàn thành"}
            </button>
            <button
              type="button"
              disabled={resultSaving}
              onClick={() => setResultTarget(null)}
              className="rounded-[14px] border border-[#efeeeb] px-4 py-2 text-sm font-medium text-[#222222] hover:bg-[#efeeeb] disabled:opacity-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {!canAct && role && (
        <p className="text-sm text-[#222222]/60">
          Tài khoản {role === "RECEPTIONIST" ? "lễ tân" : "quản trị"} chỉ xem hàng đợi, không bấm được nút gọi hay ghi kết quả.
        </p>
      )}
    </div>
  );
}
