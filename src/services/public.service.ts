import { apiClient } from "@/lib/api";
import { Specialty, Doctor } from "@/types";

export const publicService = {
  /** Lấy danh sách chuyên khoa */
  async getSpecialties(): Promise<Specialty[]> {
    const res = await apiClient.get<Specialty[]>("/public/specialties");
    return res.data;
  },

  /** Lấy danh sách bác sĩ */
  async getDoctors(): Promise<Doctor[]> {
    const res = await apiClient.get<Doctor[]>("/public/doctors");
    return res.data;
  },
};
