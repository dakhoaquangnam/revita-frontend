import { apiClient } from "@/lib/api";

export interface CounterItem {
  counterId: string;
  counterCode: string;
  counterName: string;
  location: string;
  status: "BUSY" | "AVAILABLE";
  assignedReceptionist?: {
    id: string;
    name: string;
  };
}

export interface QueuePatient {
  ticketId: string;
  queueNumber: string;
  sequence: number;
  patientName: string;
  patientAge: number;
  patientGender?: string;
  counterId: string;
  counterCode: string;
  counterName: string;
  assignedAt: string;
  preparingAt?: string;
  status: "WAITING" | "PREPARING" | "SERVING" | "COMPLETED" | "SKIPPED";
  callCount: number;
  priorityScore?: number;
  queuePriority?: number;
  isOnTime?: boolean;
  isDisabled?: boolean;
  isElderly?: boolean;
  isPregnant?: boolean;
  isVip?: boolean;
  appointmentCode?: string;
}

export interface QueueSnapshot {
  counterId: string;
  current?: QueuePatient | null;
  next?: QueuePatient | null;
  queue: QueuePatient[];
  ordered?: QueuePatient[];
}

export interface TakeNumberPayload {
  patientName?: string;
  patientAge?: number;
  patientPhone?: string;
  birthYear?: number;
  appointmentCode?: string;
  patientProfileCode?: string;
  isDisabled?: boolean;
  isElderly?: boolean;
  isPregnant?: boolean;
  isVip?: boolean;
  isVIP?: boolean;
  note?: string;
  // Quầy chỉ định theo loại luồng: hẹn trước CTR003, khám thường CTR002,
  // ưu tiên CTR001. Để trống = backend tự chọn quầy ít người đợi nhất.
  counterCode?: string;
}

export interface RoomItem {
  id: string;
  roomCode: string;
  roomName: string;
  specialtyName: string | null;
  services: { id: string; code: string; name: string }[];
  booths: {
    id: string;
    boothCode: string;
    name: string;
    doctorId: string | null;
    doctorCode: string | null;
    doctorName: string | null;
    nextAvailableAt: string | null;
    sessionEndTime: string | null;
  }[];
}

export interface TransferResult {
  prescriptionId: string;
  prescriptionCode: string;
  patientProfileId: string;
  patientName: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  boothId: string | null;
  boothCode: string | null;
  doctorId: string | null;
  doctorName: string | null;
  technicianId: string | null;
  technicianName: string | null;
  workSessionId: string | null;
  services: { serviceId: string; serviceName: string; status: string }[];
}

export const receptionistService = {
  /** Lấy danh sách quầy tiếp nhận */
  async getCounters(): Promise<CounterItem[]> {
    const res = await apiClient.get<CounterItem[]>("/counter-assignment/counters");
    return res.data;
  },

  /** Phiên làm việc hiện tại của lễ tân đang đăng nhập (null nếu chưa mở quầy). */
  async getCurrentCounter(): Promise<{
    counterId: string;
    counterCode: string;
    counterName: string;
  } | null> {
    const res = await apiClient.get("/receptionists/counters/current");
    return res.data || null;
  },

  /** Mở quầy cho ca làm việc (tạo phiên phân công ACTIVE). Backend chỉ cấp số
   *  khi có phiên ACTIVE của lễ tân đang đăng nhập. */
  async openCounter(counterId: string) {
    const res = await apiClient.post("/receptionists/counters/open", {
      counterId,
    });
    return res.data;
  },

  /** Lấy hàng đợi bệnh nhân tại quầy */
  async getQueueSnapshot(counterId: string): Promise<QueueSnapshot> {
    const res = await apiClient.get<QueueSnapshot>(`/counter-assignment/queue/${counterId}`);
    return res.data;
  },

  /** Gọi bệnh nhân tiếp theo */
  async callNextPatient(counterId: string) {
    const res = await apiClient.post(`/counter-assignment/next-patient/${counterId}`);
    return res.data;
  },

  // Gọi một bệnh nhân cụ thể trong hàng đợi (lễ tân chọn từ danh sách).
  // Backend dùng chung luồng với next-patient, chỉ khác ở việc chọn ticketId.
  async callPatientByTicket(counterId: string, ticketId: string) {
    const res = await apiClient.post(`/counter-assignment/call-patient/${counterId}`, {
      ticketId,
    });
    return res.data;
  },

  /** Bỏ qua bệnh nhân hiện tại (vắng mặt / gọi không tới) */
  async skipCurrentPatient(counterId: string) {
    const res = await apiClient.post(`/counter-assignment/skip-current/${counterId}`);
    return res.data;
  },

  /** Gọi lại bệnh nhân đang phục vụ (bấm "Gọi lại" khi bệnh nhân chưa
   *  nghe/chưa vào). Backend chỉ phát lại sự kiện gọi số, không đổi
   *  trạng thái hàng đợi. */
  async recallCurrentPatient(counterId: string) {
    const res = await apiClient.post(`/counter-assignment/recall-current/${counterId}`);
    return res.data;
  },

  /** Gọi lại bệnh nhân vừa phục vụ */
  async rollbackPreviousPatient(counterId: string) {
    const res = await apiClient.post(`/counter-assignment/rollback/${counterId}`);
    return res.data;
  },

  /** Danh sách phòng khám/trị liệu thật (kèm buồng + bác sĩ đang trực). */
  async getRooms(): Promise<RoomItem[]> {
    const res = await apiClient.get<RoomItem[]>("/routing/rooms");
    return res.data;
  },

  /** Chuyển bệnh nhân đang phục vụ ở quầy vào phòng (GĐ2). Backend tự lấy
   *  phiếu chỉ định từ lịch hẹn khi chỉ gửi appointmentCode. */
  async transferToRoom(payload: {
    appointmentCode: string;
    roomId: string;
    patientProfileId?: string;
    serviceIds?: string[];
  }): Promise<TransferResult> {
    const res = await apiClient.post<TransferResult>("/routing/transfer", payload);
    return res.data;
  },

  /** Bốc số thứ tự mới / Check-in lịch hẹn */
  async takeNumber(payload: TakeNumberPayload) {
    const res = await apiClient.post("/take-number/take", payload);
    return res.data;
  },
};
