import { apiClient } from "@/lib/api";

export interface Exercise {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  category: string;
  bodyPart?: string | null;
  condition: string;
  level: string;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultHoldSec?: number | null;
  defaultFrequency?: string | null;
  defaultDuration?: number | null;
  instructions?: string | null;
  precautions?: string | null;
  contraindications?: string | null;
  mediaUrl?: string | null;
  isActive: boolean;
}

export interface ExercisePrescriptionRow {
  id: string;
  code: string;
  patientProfileId: string;
  medicalRecordId?: string | null;
  appointmentId?: string | null;
  exerciseId: string;
  exercise: Exercise;
  prescribedById: string;
  prescribedByRole: string;
  sets?: number | null;
  reps?: number | null;
  holdSec?: number | null;
  frequency?: string | null;
  durationDays?: number | null;
  note?: string | null;
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
  createdAt: string;
}

export const EXERCISE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang tập",
  COMPLETED: "Đã hoàn thành",
  PAUSED: "Tạm dừng",
  CANCELLED: "Đã hủy",
};

export const exerciseService = {
  /** Danh mục bài tập, lọc theo bệnh lý là chính (GET /exercises). */
  async listExercises(filters: {
    condition?: string;
    category?: string;
    search?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ data: Exercise[]; meta: { total: number; limit: number; skip: number } }> {
    const res = await apiClient.get("/exercises", { params: filters });
    return res.data;
  },

  async getExercise(id: string): Promise<Exercise> {
    const res = await apiClient.get(`/exercises/${id}`);
    return res.data;
  },

  /** Kê 1 lần nhiều bài — trả về mã EXP-… chung + từng dòng. */
  async createExercisePrescription(payload: {
    patientProfileId: string;
    medicalRecordId?: string;
    appointmentId?: string;
    items: {
      exerciseId: string;
      sets?: number;
      reps?: number;
      holdSec?: number;
      frequency?: string;
      durationDays?: number;
      note?: string;
    }[];
  }): Promise<{ code: string; data: ExercisePrescriptionRow[] }> {
    const res = await apiClient.post("/exercise-prescriptions", payload);
    return res.data;
  },

  async listPatientExercisePrescriptions(
    patientProfileId: string,
    options?: { status?: string; limit?: number; skip?: number },
  ): Promise<{
    data: ExercisePrescriptionRow[];
    meta: { total: number; limit: number; skip: number };
  }> {
    const res = await apiClient.get(
      `/exercise-prescriptions/patient/${patientProfileId}`,
      { params: options },
    );
    return res.data;
  },

  async updateExercisePrescriptionStatus(
    id: string,
    status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED",
  ): Promise<ExercisePrescriptionRow> {
    const res = await apiClient.patch(`/exercise-prescriptions/${id}/status`, {
      status,
    });
    return res.data;
  },
};
