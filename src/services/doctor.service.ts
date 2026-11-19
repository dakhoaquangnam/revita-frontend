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

// GĐ4 — 1 dòng thuốc trong đơn (đủ trường có cấu trúc, thay cho
// PrescriptionItem cũ chỉ có tên/liều/cách dùng dạng text).
export interface DrugRow {
  id: string;
  drugId?: string;
  name: string;
  strength?: string;
  dosageForm?: string;
  route?: string;
  dose?: number;
  doseUnit?: string;
  frequency?: string;
  durationDays?: number;
  quantity?: number;
  quantityUnit?: string;
  instructions?: string;
}

// GĐ4 — 1 bài tập đã chọn trong đơn bài tập (liều ghi đè mặc định danh mục).
export interface ExerciseRow {
  exerciseId: string;
  name: string;
  category: string;
  sets?: number;
  reps?: number;
  holdSec?: number;
  frequency?: string;
  durationDays?: number;
  note?: string;
  precautions?: string;
}

export interface MedicationPrescription {
  id: string;
  code: string;
  doctorId: string;
  patientProfileId: string;
  medicalRecordId?: string | null;
  note?: string | null;
  status: "DRAFT" | "SIGNED" | "DISPENSED" | "CANCELLED";
  signedAt?: string | null;
  createdAt: string;
  items: {
    id: string;
    name: string;
    strength?: string | null;
    dosageForm?: string | null;
    route?: string | null;
    dose?: number | null;
    doseUnit?: string | null;
    frequency?: string | null;
    durationDays?: number | null;
    quantity?: number | null;
    quantityUnit?: string | null;
    instructions?: string | null;
    drugId?: string | null;
  }[];
  patientProfile?: { name?: string; profileCode?: string; allergies?: string | null };
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
   * Bệnh án của 1 bệnh nhân (để trang bác sĩ hiện "Đã lưu hôm nay" sau khi
   * làm mới trang — tránh tưởng chưa lưu rồi bấm lưu trùng).
   */
  async listMedicalRecordsByPatient(patientProfileId: string) {
    const res = await apiClient.get(
      `/medical-records/patient-profile/${patientProfileId}`,
    );
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
   * GĐ4: gửi đủ trường có cấu trúc (liều số, đường dùng, số ngày, số lượng,
   * cách dùng, drugId từ danh mục) — không còn làm rơi số lượng/số ngày
   * như bản cũ (chỉ map tên/liều/cách dùng). Đơn mới luôn DRAFT; ký qua
   * signMedicationPrescription.
   */
  async createMedicationPrescription(payload: {
    patientProfileId: string;
    medicalRecordId?: string;
    note?: string;
    items: {
      drugId?: string;
      name: string;
      ndc?: string;
      strength?: string;
      dosageForm?: string;
      route?: string;
      dose?: number;
      doseUnit?: string;
      frequency?: string;
      durationDays?: number;
      quantity?: number;
      quantityUnit?: string;
      instructions?: string;
    }[];
  }) {
    const res = await apiClient.post("/medication-prescriptions", payload);
    return res.data;
  },

  /** GĐ4 — ký đơn (DRAFT → SIGNED, chỉ bác sĩ kê đơn). */
  async signMedicationPrescription(id: string) {
    const res = await apiClient.patch(`/medication-prescriptions/${id}/sign`);
    return res.data;
  },

  /** GĐ4 — phát thuốc (SIGNED → DISPENSED, bác sĩ bấm — Q3). */
  async dispenseMedicationPrescription(id: string) {
    const res = await apiClient.patch(`/medication-prescriptions/${id}/dispense`);
    return res.data;
  },

  /** GĐ4 — hủy đơn (DRAFT|SIGNED → CANCELLED). */
  async cancelMedicationPrescription(id: string) {
    const res = await apiClient.post(`/medication-prescriptions/${id}/cancel`);
    return res.data;
  },

  /** GĐ4 — đơn thuốc của bác sĩ đang đăng nhập (để hiện lịch sử đơn cũ). */
  async listMyMedicationPrescriptions(limit = 20): Promise<{
    results: MedicationPrescription[];
    total: number;
  }> {
    const res = await apiClient.get("/medication-prescriptions/mine", {
      params: { limit },
    });
    return res.data;
  },

  /** GĐ4 — đơn thuốc theo bệnh án. */
  async listMedicationPrescriptionsByMedicalRecord(
    medicalRecordId: string,
  ): Promise<{ results: MedicationPrescription[]; total: number }> {
    const res = await apiClient.get(
      `/medication-prescriptions/medical-record/${medicalRecordId}`,
    );
    return res.data;
  },

  /** GĐ4 — cập nhật hồ sơ bệnh nhân (dị ứng...). */
  async updatePatientProfile(
    patientProfileId: string,
    payload: { allergies?: string },
  ) {
    const res = await apiClient.patch(
      `/patient-profiles/${patientProfileId}`,
      payload,
    );
    return res.data;
  },
};
