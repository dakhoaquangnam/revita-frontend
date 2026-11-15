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

  /** Bỏ qua bệnh nhân hiện tại (vắng mặt / gọi không tới) */
  async skipCurrentPatient(counterId: string) {
    const res = await apiClient.post(`/counter-assignment/skip-current/${counterId}`);
    return res.data;
  },

  /** Gọi lại bệnh nhân vừa phục vụ */
  async rollbackPreviousPatient(counterId: string) {
    const res = await apiClient.post(`/counter-assignment/rollback/${counterId}`);
    return res.data;
  },

  /** Bốc số thứ tự mới / Check-in lịch hẹn */
  async takeNumber(payload: TakeNumberPayload) {
    const res = await apiClient.post("/take-number/take", payload);
    return res.data;
  },
};
