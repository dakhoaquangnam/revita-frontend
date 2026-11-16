import { apiClient } from "@/lib/api";

// GĐ3 — Service thang điểm PHCN + mục tiêu điều trị (backend: /assessments, /rehab-goals).
// LỖI PHẢI NỔI LÊN: không trả "thành công giả" khi backend lỗi — bác sĩ phải
// thấy đúng tên mục sai (VD: "Ăn (7 không nằm trong các mức cho phép)").

export interface ScaleItemDef {
  key: string;
  labelVi: string;
  labelEn?: string;
  min: number;
  max: number;
  step?: number;
  options?: { value: string | number; labelVi: string }[];
  normalRange?: number;
}

export interface ScaleDef {
  code: string;
  nameVi: string;
  nameEn: string;
  kind: "MULTI_ITEM" | "CLASSIFICATION" | "SINGLE_VALUE" | "PER_MEASURE";
  specialty: string[];
  conditions: string[];
  assessorType: "TB" | "NT" | "QS";
  vietnameseStatus: "OFFICIAL" | "INTERNAL" | "NOT_NEEDED";
  vietnameseSource?: string;
  allowedRoles: string[];
  direction: "HIGHER_BETTER" | "LOWER_BETTER";
  items: ScaleItemDef[];
  subscales?: { key: string; labelVi: string; itemKeys: string[] }[];
  scoring: {
    method: string;
    maxTotal?: number;
    bands?: { min: number; max: number; text: string }[];
  };
  mcid?: { value: number; unit: string; text: string };
  timepoints: string[];
}

export interface AssessmentRecord {
  id: string;
  patientProfileId: string;
  medicalRecordId?: string | null;
  appointmentId?: string | null;
  scaleCode: string;
  scaleNameVi: string;
  condition: string;
  specialty: string;
  assessorType: string;
  vietnameseStatus: string;
  timepoint: string;
  assessedAt: string;
  assessedByAuthId: string;
  assessedByRole: string;
  assessedByName?: string | null;
  itemScores: any;
  subscaleScores?: Record<string, number> | null;
  totalScore?: number | null;
  value?: number | null;
  unit?: string | null;
  level?: string | null;
  interpretation?: string | null;
  notes?: string | null;
  isActive: boolean;
  voidReason?: string | null;
  voidedAt?: string | null;
  createdAt: string;
}

export interface TrendPoint {
  id: string;
  assessedAt: string;
  timepoint: string;
  totalScore?: number | null;
  value?: number | null;
  level?: string | null;
  subscaleScores?: Record<string, number> | null;
  interpretation?: string | null;
  deltaVsPrevious?: number | null;
  deltaVsBaseline?: number | null;
  mcidReached?: boolean | null;
}

export interface GoalWithProgress {
  id: string;
  patientProfileId: string;
  scaleCode?: string | null;
  scaleNameVi?: string | null;
  itemKey?: string | null;
  title: string;
  baselineAssessmentId?: string | null;
  baselineValue?: number | null;
  targetValue: number;
  direction: string;
  unit?: string | null;
  targetDate?: string | null;
  status: "ACTIVE" | "ACHIEVED" | "NOT_ACHIEVED" | "CANCELLED";
  achievedAssessmentId?: string | null;
  achievedAt?: string | null;
  notAchievedReason?: string | null;
  notes?: string | null;
  createdAt: string;
  currentValue?: number | null;
  currentAssessmentId?: string | null;
  progressPct?: number | null;
  achieved: boolean;
  daysLeft?: number | null;
}

export interface MeasureInput {
  key: string;
  side?: "LEFT" | "RIGHT" | "BOTH";
  value?: number;
  active?: number;
  passive?: number;
}

export const CONDITION_OPTIONS = [
  { value: "GENERAL", label: "Chung (không phân bệnh lý)" },
  { value: "STROKE", label: "Đột quỵ" },
  { value: "TBI", label: "Chấn thương sọ não" },
  { value: "SCI", label: "Tổn thương tủy sống" },
  { value: "LBP", label: "Đau thắt lưng" },
  { value: "NECK", label: "Đau cổ" },
  { value: "THA", label: "Thay khớp háng" },
  { value: "TKA", label: "Thay khớp gối" },
  { value: "ACL", label: "Tái tạo dây chằng gối" },
  { value: "MENISCUS", label: "Khâu sụn chêm gối" },
  { value: "CP", label: "Bại não" },
  { value: "ASD", label: "Tự kỷ" },
];

export const SPECIALTY_OPTIONS = [
  { value: "VLTL", label: "Vật lý trị liệu" },
  { value: "HDTL", label: "Hoạt động trị liệu" },
  { value: "NNTL", label: "Ngôn ngữ trị liệu" },
  { value: "DDCS", label: "Điều dưỡng chăm sóc" },
  { value: "BS", label: "Bác sĩ" },
];

export const TIMEPOINT_OPTIONS = [
  { value: "BASELINE", label: "Đầu vào (ĐV)" },
  { value: "REASSESSMENT", label: "Tái đánh giá (TĐG)" },
  { value: "DISCHARGE", label: "Ra viện (RV)" },
];

export function vietnameseBadge(status: string): { text: string; className: string } {
  if (status === "OFFICIAL")
    return {
      text: "Bản tiếng Việt chuẩn hóa",
      className: "bg-[#e1f4df] text-[#0f3e17] border-[#cfe7d3]",
    };
  if (status === "INTERNAL")
    return {
      text: "Bản dịch nội bộ — chưa chuẩn hóa",
      className: "bg-amber-100 text-amber-800 border-amber-300",
    };
  return {
    text: "Thang số — không cần dịch",
    className: "bg-[#efeeeb] text-[#222222]/70 border-[#efeeeb]",
  };
}

export const assessmentService = {
  async getScales(params?: { condition?: string; specialty?: string }): Promise<ScaleDef[]> {
    const res = await apiClient.get("/assessments/scales", { params });
    return res.data;
  },

  async getScale(code: string): Promise<ScaleDef> {
    const res = await apiClient.get(`/assessments/scales/${code}`);
    return res.data;
  },

  async createAssessment(payload: {
    patientProfileId: string;
    scaleCode: string;
    condition: string;
    specialty: string;
    timepoint: string;
    appointmentId?: string;
    medicalRecordId?: string;
    // GĐ5 — gắn lần đánh giá lại với buổi trị liệu vừa xong.
    therapySessionId?: string;
    itemScores?: Record<string, number>;
    value?: number;
    level?: string;
    measures?: MeasureInput[];
    notes?: string;
  }): Promise<AssessmentRecord> {
    const res = await apiClient.post("/assessments", payload);
    return res.data;
  },

  async getPatientAssessments(
    patientProfileId: string,
    params?: { scaleCode?: string; timepoint?: string; page?: number; limit?: number },
  ): Promise<{ data: AssessmentRecord[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const res = await apiClient.get(`/assessments/patient-profile/${patientProfileId}`, { params });
    return res.data;
  },

  async getTrend(
    patientProfileId: string,
    scaleCode: string,
  ): Promise<{ scaleCode: string; baseline: any; points: TrendPoint[] }> {
    const res = await apiClient.get(
      `/assessments/patient-profile/${patientProfileId}/trend`,
      { params: { scaleCode } },
    );
    return res.data;
  },

  async voidAssessment(id: string, voidReason: string): Promise<AssessmentRecord> {
    const res = await apiClient.patch(`/assessments/${id}/void`, { voidReason });
    return res.data;
  },

  async createGoal(payload: {
    patientProfileId: string;
    medicalRecordId?: string;
    scaleCode?: string;
    itemKey?: string;
    title: string;
    baselineAssessmentId?: string;
    baselineValue?: number;
    targetValue: number;
    direction: string;
    unit?: string;
    targetDate?: string;
    notes?: string;
  }): Promise<GoalWithProgress> {
    const res = await apiClient.post("/rehab-goals", payload);
    return res.data;
  },

  async getPatientGoals(
    patientProfileId: string,
    status?: string,
  ): Promise<{ data: GoalWithProgress[] }> {
    const res = await apiClient.get(`/rehab-goals/patient-profile/${patientProfileId}`, {
      params: status ? { status } : {},
    });
    return res.data;
  },

  async getGoal(id: string): Promise<GoalWithProgress> {
    const res = await apiClient.get(`/rehab-goals/${id}`);
    return res.data;
  },

  async updateGoal(
    id: string,
    payload: { title?: string; targetValue?: number; targetDate?: string; notes?: string },
  ): Promise<GoalWithProgress> {
    const res = await apiClient.patch(`/rehab-goals/${id}`, payload);
    return res.data;
  },

  async markGoalAchieved(id: string, assessmentId: string): Promise<GoalWithProgress> {
    const res = await apiClient.post(`/rehab-goals/${id}/mark-achieved`, { assessmentId });
    return res.data;
  },

  async markGoalNotAchieved(id: string, reason: string): Promise<GoalWithProgress> {
    const res = await apiClient.post(`/rehab-goals/${id}/mark-not-achieved`, { reason });
    return res.data;
  },

  async cancelGoal(id: string, reason?: string): Promise<GoalWithProgress> {
    const res = await apiClient.patch(`/rehab-goals/${id}/cancel`, { reason });
    return res.data;
  },
};
