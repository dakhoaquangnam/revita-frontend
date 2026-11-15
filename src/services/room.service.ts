import { apiClient } from "@/lib/api";

// GĐ2 §4.4.1 — API cho màn hình phòng /dashboard/room.

export type TherapyStatus =
  | "WAITING"
  | "PREPARING"
  | "SERVING"
  | "WAITING_RESULT"
  | "RETURNING"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED"
  | "NOT_STARTED"
  | "PENDING"
  | "RESCHEDULED";

export interface TherapyQueueItem {
  id: string; // id của PrescriptionService (dùng cho mọi thao tác)
  prescriptionId: string;
  prescriptionCode: string;
  serviceId: string;
  serviceName: string;
  status: TherapyStatus;
  patientProfileId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  technicianId?: string;
  technicianName?: string;
  boothId?: string;
  boothCode?: string;
  boothName?: string;
}

export interface ExamQueueItem {
  appointmentCode: string;
  patientProfileId: string;
  patientName: string;
  profileCode: string;
  serviceId: string | null;
  serviceName: string | null;
  serviceCode: string | null;
  doctorId: string;
  doctorName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface RoomQueue {
  roomId: string;
  roomCode: string;
  roomName: string;
  therapyQueue: TherapyQueueItem[];
  examQueue: ExamQueueItem[];
}

export interface CallPatientResult {
  success: boolean;
  currentPatient?: { patientName: string; status: string } | null;
  nextPatient?: { patientName: string; status: string } | null;
  message: string;
}

export function getApiErrorMessage(err: any, fallback: string): string {
  const msg = err?.response?.data?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (Array.isArray(msg)) return msg.join("; ");
  return err?.message || fallback;
}

export const roomService = {
  getRoomQueue(roomId: string) {
    return apiClient
      .get<RoomQueue>(`/routing/rooms/${roomId}/queue`)
      .then((r) => r.data);
  },

  // Mời đúng 1 bệnh nhân trị liệu vào phòng (POST /prescriptions/call-patient).
  // Lưu ý: endpoint tự hoàn thành người đang SERVING của nhân viên này
  // (giống call-next-patient) nên UI xác nhận trước khi gọi.
  callPatient(prescriptionServiceId: string) {
    return apiClient
      .post<CallPatientResult>("/prescriptions/call-patient", {
        prescriptionServiceId,
      })
      .then((r) => r.data);
  },

  // Mời 1 lịch khám vào phòng (POST /routing/rooms/:roomId/call-appointment).
  callAppointment(roomId: string, appointmentCode: string) {
    return apiClient
      .post(`/routing/rooms/${roomId}/call-appointment`, { appointmentCode })
      .then((r) => r.data);
  },

  updateStatus(
    prescriptionServiceId: string,
    status: TherapyStatus,
    note?: string,
  ) {
    return apiClient
      .put("/prescriptions/prescription-service/status", {
        prescriptionServiceId,
        status,
        note,
      })
      .then((r) => r.data);
  },

  // Ghi kết quả: backend yêu cầu dịch vụ đang ở WAITING_RESULT mới nhận
  // results, rồi tự chuyển COMPLETED. UI gọi updateStatus WAITING_RESULT
  // trước rồi mới gọi hàm này (xem RoomPage.handleSubmitResults).
  updateResults(prescriptionServiceId: string, results: string[], note?: string) {
    return apiClient
      .put("/prescriptions/prescription-service/results", {
        prescriptionServiceId,
        results,
        note,
      })
      .then((r) => r.data);
  },

  skipService(prescriptionServiceId: string) {
    return apiClient
      .put("/prescriptions/prescription-service/skip", {
        prescriptionServiceId,
      })
      .then((r) => r.data);
  },
};
