import { apiClient } from "@/lib/api";

export interface AdminKpi {
  totalRevenue: number;
  revenueGrowth: number;
  totalExaminations: number;
  totalAppointments: number;
  recoveryRate: number; // Tỷ lệ phục hồi mục tiêu FIM %
  retentionRate: number; // Tỷ lệ quay lại %
}

export interface ServicePriceItem {
  id: string;
  code: string;
  name: string;
  category: "ASSESSMENT" | "PHYSICAL" | "OCCUPATIONAL" | "SPEECH";
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export interface StaffScheduleItem {
  id: string;
  name: string;
  role: "DOCTOR" | "TECHNICIAN" | "RECEPTIONIST" | "CASHIER";
  specialty: string;
  shift: "MORNING" | "AFTERNOON" | "EVENING";
  assignedRoom: string;
  status: "ONLINE" | "BUSY" | "OFFLINE";
}

export const adminService = {
  /** Lấy dữ liệu KPI thống kê */
  async getQuickKpi(period = "MONTH") {
    try {
      const res = await apiClient.get(`/statistics/kpi?period=${period}`);
      return res.data;
    } catch (err) {
      console.warn("KPI API fallback:", err);
      return null;
    }
  },

  /** Lấy thống kê doanh thu */
  async getRevenueStats(period = "MONTH") {
    try {
      const res = await apiClient.get(`/statistics/revenue?period=${period}`);
      return res.data;
    } catch (err) {
      console.warn("Revenue API fallback:", err);
      return null;
    }
  },
};
