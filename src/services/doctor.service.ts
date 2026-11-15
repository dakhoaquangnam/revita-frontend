import { apiClient } from "@/lib/api";

export interface FimAssessment {
  eating: number; // 1-7
  grooming: number;
  bathing: number;
  dressingUpper: number;
  dressingLower: number;
  toileting: number;
  bladder: number;
  bowel: number;
  bedChairTransfer: number;
  toiletTransfer: number;
  tubTransfer: number;
  locomotion: number;
  stairs: number;
  comprehension: number;
  expression: number;
  socialInteraction: number;
  problemSolving: number;
  memory: number;
}

export interface RomMeasurement {
  joint: string; // "Khớp gối", "Khớp vai", "Cột sống thắt lưng"
  movement: string; // "Gập", "Duỗi", "Dang"
  normalRange: string; // "0 - 135°"
  leftAngle: number;
  rightAngle: number;
  targetAngle: number;
}

export interface PrescriptionItem {
  id: string;
  name: string;
  dosage: string;
  quantity: string;
  usage: string;
}

export interface HomeExercisePrescription {
  id: string;
  name: string;
  category: string;
  sets: string; // e.g. "3 hiệp x 15 lần"
  frequency: string; // e.g. "Sáng và Chiều mỗi ngày"
  precautions: string;
}

export interface DoctorExamSession {
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  queueNumber: string;
  diagnosis: string;
  symptoms: string;
  painScale: number; // 0-10 VAS
  fim: FimAssessment;
  rom: RomMeasurement[];
  prescriptions: PrescriptionItem[];
  exercises: HomeExercisePrescription[];
  notes: string;
  nextAppointmentDate?: string;
}

export const doctorService = {
  /**
   * Lưu hồ sơ bệnh án và lượng giá PHCN.
   * LỖI PHẢI NỔI LÊN: không được trả "thành công giả" khi backend lỗi —
   * bác sĩ phải thấy lỗi và bấm lưu lại, thay vì tưởng đã lưu.
   */
  async createMedicalRecord(payload: {
    patientProfileId?: string;
    appointmentCode?: string;
    templateId?: string;
    content: any;
    status: "DRAFT" | "IN_PROGRESS" | "COMPLETED";
  }) {
    const res = await apiClient.post("/medical-records", payload);
    return res.data;
  },

  /**
   * Lấy danh sách template bệnh án để tìm template PHCN
   * (PHUC_HOI_CHUC_NANG) — bắt buộc khi tạo bệnh án (backend yêu cầu
   * templateId; thiếu thì Prisma lỗi).
   */
  async getTemplates(): Promise<
    { id: string; templateCode: string; name?: string }[]
  > {
    const res = await apiClient.get("/medical-records/templates");
    return res.data;
  },

  /**
   * Tạo phiếu chỉ định dịch vụ trị liệu (POST /prescriptions).
   * Mỗi mục cần serviceId thật của backend; trạng thái ban đầu NOT_STARTED.
   */
  async createPrescription(payload: {
    patientProfileId: string;
    medicalRecordId?: string;
    note?: string;
    services: { serviceId: string; order?: number; note?: string }[];
  }) {
    const res = await apiClient.post("/prescriptions", payload);
    return res.data;
  },

  /**
   * Tạo đơn thuốc (POST /medication-prescriptions).
   * Form thuốc của phòng khám nhập tự do nên chỉ map được tên/liều/cách dùng;
   * các trường có cấu trúc (liều số, đơn vị, số ngày) để trống cho bác sĩ
   * bổ sung sau, không tự suy diễn từ chữ.
   */
  async createMedicationPrescription(payload: {
    patientProfileId: string;
    medicalRecordId?: string;
    note?: string;
    items: {
      name: string;
      strength?: string;
      frequency?: string;
    }[];
  }) {
    const res = await apiClient.post("/medication-prescriptions", payload);
    return res.data;
  },
};
