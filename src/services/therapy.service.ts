import { apiClient } from "@/lib/api";

// GĐ5 — Buổi trị liệu + đánh giá lại + hoàn thành can thiệp + nhật ký tự tập.
// Hợp đồng backend đã deploy live trên VPS (xem THIET-KE-GD5.md §5 + §9):
// 1 buổi gồm NHIỀU dịch vụ (Q1), VAS tùy chọn (Q3), nhắc đánh giá lại sau
// 5 buổi (Q4), hoàn thành cần đủ 2 điều kiện + ngoại lệ có lý do (Q5),
// nút "Nhận" (Q6), nhật ký tự tập làm ngay đợt 1 (Q7), không in phiếu (Q8).

export interface TherapySessionServiceRef {
  id: string;
  serviceId?: string;
  serviceName?: string;
  status?: string;
}

export interface TherapySessionExerciseRow {
  id: string;
  exercisePrescriptionId?: string | null;
  exerciseId: string;
  exerciseName?: string;
  setsDone?: number | null;
  repsDone?: number | null;
  holdSecDone?: number | null;
  painDuring?: number | null;
  completed?: boolean;
  note?: string | null;
}

export interface TherapySession {
  id: string;
  code: string;
  sessionNumber?: number;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  prescriptionServiceId?: string;
  prescriptionServiceIds?: string[];
  services?: TherapySessionServiceRef[];
  patientProfileId: string;
  patientName?: string;
  performedByName?: string;
  performedByRole?: string;
  startedAt: string;
  completedAt?: string | null;
  durationMinutes?: number | null;
  painBefore?: { id?: string; value?: number } | number | null;
  painAfter?: { id?: string; value?: number } | number | null;
  notes?: string | null;
  adverseEvent?: string | null;
  stoppedEarly?: boolean;
  exercises?: TherapySessionExerciseRow[];
  cancelReason?: string | null;
}

export interface TherapyProgressGoalDue {
  scaleCode: string;
  scaleNameVi?: string;
  goalId?: string;
  completedSessions?: number;
  reassessAfterSessions?: number;
}

export interface TherapyProgress {
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  cancelledSessions: number;
  sessionsByService?: { serviceId?: string; serviceName?: string; count?: number; total?: number }[];
  goalsDue: TherapyProgressGoalDue[];
}

export interface CompletionCheck {
  canComplete: boolean;
  missing: string[];
  unfinishedServices: { id?: string; serviceName?: string; status?: string }[];
  hasDischargeAssessment: boolean;
  totalServices: number;
  finishedServices: number;
}

export interface HomeExerciseLog {
  id: string;
  code?: string;
  patientProfileId: string;
  patientName?: string;
  exercisePrescriptionId?: string | null;
  exerciseId: string;
  exerciseName?: string;
  loggedDate?: string;
  setsDone?: number | null;
  repsDone?: number | null;
  holdSecDone?: number | null;
  painDuring?: number | null;
  completed?: boolean;
  note?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote?: string | null;
  reviewedByName?: string | null;
  createdAt: string;
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const d = data as { data?: unknown; items?: unknown; results?: unknown; records?: unknown } | null;
  if (d && Array.isArray(d.data)) return d.data as T[];
  if (d && Array.isArray(d.items)) return d.items as T[];
  if (d && Array.isArray(d.results)) return d.results as T[];
  if (d && Array.isArray(d.records)) return d.records as T[];
  return [];
}

function unwrapOne<T>(data: unknown): T {
  const d = data as { data?: unknown } | null;
  if (d && d.data !== undefined && typeof d.data === "object" && d.data !== null) return d.data as T;
  return data as T;
}

export function therapySessionVas(v: TherapySession["painBefore"]): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v.value === "number") return v.value;
  return null;
}

export function therapySessionDurationMin(s: TherapySession): number | null {
  if (typeof s.durationMinutes === "number") return s.durationMinutes;
  if (s.startedAt && s.completedAt) {
    const ms = new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime();
    if (!Number.isNaN(ms) && ms >= 0) return Math.round(ms / 60000);
  }
  return null;
}

export const therapyService = {
  /** Bắt đầu 1 buổi (1 buổi gồm NHIỀU dịch vụ — Q1). Nest trả 201. */
  async startSession(payload: {
    prescriptionServiceIds: string[];
    painBefore?: number;
    notes?: string;
  }): Promise<TherapySession> {
    const res = await apiClient.post("/therapy-sessions/start", {
      ...payload,
      // Backend chấp nhận cả prescriptionServiceId đơn.
      prescriptionServiceId: payload.prescriptionServiceIds[0],
    });
    return unwrapOne<TherapySession>(res.data);
  },

  async getSession(id: string): Promise<TherapySession> {
    const res = await apiClient.get(`/therapy-sessions/${id}`);
    return unwrapOne<TherapySession>(res.data);
  },

  async getPatientSessions(patientProfileId: string): Promise<TherapySession[]> {
    const res = await apiClient.get(`/therapy-sessions/patient/${patientProfileId}`, {
      params: { limit: 50 },
    });
    return unwrapList<TherapySession>(res.data);
  },

  async getServiceSessions(prescriptionServiceId: string): Promise<TherapySession[]> {
    const res = await apiClient.get(
      `/therapy-sessions/prescription-service/${prescriptionServiceId}`,
    );
    return unwrapList<TherapySession>(res.data);
  },

  async addSessionExercise(
    sessionId: string,
    payload: {
      exercisePrescriptionId?: string;
      exerciseId: string;
      setsDone?: number;
      repsDone?: number;
      holdSecDone?: number;
      painDuring?: number;
      completed?: boolean;
      note?: string;
    },
  ): Promise<TherapySessionExerciseRow> {
    const res = await apiClient.post(`/therapy-sessions/${sessionId}/exercises`, payload);
    return unwrapOne<TherapySessionExerciseRow>(res.data);
  },

  async finishSession(
    sessionId: string,
    payload: {
      painAfter?: number;
      notes?: string;
      adverseEvent?: string;
      stoppedEarly?: boolean;
    },
  ): Promise<TherapySession> {
    const res = await apiClient.patch(`/therapy-sessions/${sessionId}/finish`, payload);
    return unwrapOne<TherapySession>(res.data);
  },

  async cancelSession(sessionId: string, reason: string): Promise<TherapySession> {
    const res = await apiClient.patch(`/therapy-sessions/${sessionId}/cancel`, { reason });
    return unwrapOne<TherapySession>(res.data);
  },

  async getProgress(patientProfileId: string): Promise<TherapyProgress> {
    const res = await apiClient.get(
      `/therapy-sessions/patient/${patientProfileId}/progress`,
    );
    const d = unwrapOne<TherapyProgress>(res.data);
    return { ...d, goalsDue: Array.isArray(d.goalsDue) ? d.goalsDue : [] };
  },

  async getCompletionCheck(prescriptionId: string): Promise<CompletionCheck> {
    const res = await apiClient.get(`/prescriptions/${prescriptionId}/completion-check`);
    const d = unwrapOne<CompletionCheck>(res.data);
    return {
      ...d,
      missing: Array.isArray(d.missing) ? d.missing : [],
      unfinishedServices: Array.isArray(d.unfinishedServices) ? d.unfinishedServices : [],
    };
  },

  async completeIntervention(
    prescriptionId: string,
    reason?: string,
  ): Promise<{ completionReason?: string | null; bypassedMissing?: string[] } & Record<string, unknown>> {
    const res = await apiClient.post(`/prescriptions/${prescriptionId}/complete-intervention`, {
      reason: reason?.trim() || undefined,
    });
    return res.data as { completionReason?: string | null; bypassedMissing?: string[] };
  },

  // Q7 — nhật ký tự tập ở nhà (bệnh nhân ghi, KTV/bác sĩ duyệt).
  async createHomeLog(payload: {
    patientProfileId: string;
    exercisePrescriptionId?: string;
    exerciseId: string;
    loggedDate?: string;
    setsDone?: number;
    repsDone?: number;
    holdSecDone?: number;
    painDuring?: number;
    completed?: boolean;
    note?: string;
  }): Promise<HomeExerciseLog> {
    const res = await apiClient.post("/home-exercise-logs", payload);
    return unwrapOne<HomeExerciseLog>(res.data);
  },

  async getMyHomeLogs(params?: {
    patientProfileId?: string;
    status?: string;
  }): Promise<HomeExerciseLog[]> {
    const res = await apiClient.get("/home-exercise-logs/mine", { params });
    return unwrapList<HomeExerciseLog>(res.data);
  },

  async getPatientHomeLogs(
    patientProfileId: string,
    params?: { status?: string },
  ): Promise<HomeExerciseLog[]> {
    const res = await apiClient.get(`/home-exercise-logs/patient/${patientProfileId}`, {
      params,
    });
    return unwrapList<HomeExerciseLog>(res.data);
  },

  async reviewHomeLog(
    id: string,
    payload: { status: "APPROVED" | "REJECTED"; reviewNote?: string },
  ): Promise<HomeExerciseLog> {
    const res = await apiClient.patch(`/home-exercise-logs/${id}/review`, payload);
    return unwrapOne<HomeExerciseLog>(res.data);
  },
};
