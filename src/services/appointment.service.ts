import { apiClient } from "@/lib/api";

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  reason?: string;
}

export interface AvailableSlotsResponse {
  doctorId: string;
  doctorName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  workSessionStart: string;
  workSessionEnd: string;
  slots: AvailableSlot[];
}

export interface AvailableDoctor {
  doctorId: string;
  doctorCode: string;
  doctorName: string;
  specialtyId: string;
  specialtyName: string;
  rating: number;
  workSessionStart: string;
  workSessionEnd: string;
  boothId?: string;
  boothName?: string;
  roomName?: string;
}

export interface AvailableDoctorsResponse {
  specialtyId: string;
  specialtyName: string;
  date: string;
  doctors: AvailableDoctor[];
}

export interface DoctorServiceItem {
  serviceId: string;
  serviceCode?: string;
  serviceName: string;
  price?: number;
  timePerPatient?: number;
  description?: string;
}

export interface BookAppointmentPayload {
  patientProfileId: string;
  doctorId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
}

/** Khớp với BookAppointmentResponseDto của backend (không có trường `code`/`message`). */
export interface BookAppointmentResponse {
  appointmentId: string;
  appointmentCode: string;
  doctorId: string;
  doctorName: string;
  patientProfileId: string;
  patientName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
}

/** Hồ sơ bệnh nhân kèm trong lịch hẹn (PatientAppointmentDto.patientProfile). */
export interface PatientProfileSummary {
  id: string;
  profileCode: string;
  name: string;
  age?: number;
  gender?: string;
  dateOfBirth?: string;
  phone?: string | null;
  isPregnant?: boolean;
  isDisabled?: boolean;
}

/** Khớp với PatientAppointmentDto của backend. */
export interface AppointmentDetail {
  appointmentId: string;
  appointmentCode: string;
  patientProfileCode: string;
  patientProfileId?: string;
  patientProfile?: PatientProfileSummary;
  doctorId: string;
  doctorName: string;
  specialtyId: string;
  specialtyName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  services: {
    serviceId: string;
    serviceName: string;
    serviceCode: string;
    price: number | null;
    timePerPatient: number;
  }[];
  createdAt: string;
}

  /**
 * Chuẩn hoá mã vé trước khi tra cứu. Bàn phím điện thoại đôi khi gõ ra chữ
 * Cyrillic trông giống hệt chữ Latin (Т thay cho T, А thay cho A...), khiến
 * backend tra cứu chính xác theo mã và trả 404 dù mắt nhìn mã giống hệt.
 * Hàm này đổi các chữ Cyrillic "giống hệt" về chữ Latin tương ứng và bỏ
 * ký tự tàng hình (zero-width space, BOM) hay dính khi sao chép.
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  А: "A", а: "a", В: "B", в: "b", Е: "E", е: "e",
  К: "K", к: "k", М: "M", м: "m", Н: "H", н: "h",
  О: "O", о: "o", Р: "P", р: "p", С: "C", с: "c",
  Т: "T", т: "t", Х: "X", х: "x", У: "Y", у: "y",
  І: "I", і: "i", Ј: "J", ј: "j", Ѕ: "S", ѕ: "s",
};

export function normalizeAppointmentCode(code: string): string {
  return code
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .split("")
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join("")
    .trim();
}

export const appointmentService = {
  /** Bác sĩ có lịch làm việc trong ngày cụ thể theo chuyên khoa (public). */
  async getAvailableDoctors(params: {
    specialtyId: string;
    date: string;
  }): Promise<AvailableDoctorsResponse> {
    const res = await apiClient.get<AvailableDoctorsResponse>(
      "/appointment-booking/doctors/available",
      { params },
    );
    return res.data;
  },

  /** Bác sĩ theo chuyên khoa, không lọc theo ngày (public). */
  async getDoctorsBySpecialty(
    specialtyId: string,
  ): Promise<AvailableDoctorsResponse> {
    const res = await apiClient.get(
      `/appointment-booking/specialties/${specialtyId}/doctors`,
    );
    const data = res.data;
    if (Array.isArray(data)) {
      return {
        specialtyId,
        specialtyName: "",
        date: "",
        doctors: data,
      };
    }
    return data;
  },

  /**
   * Dịch vụ của một bác sĩ trong một ngày, kèm giá thật (public).
   * Backend bắt buộc query `date` (YYYY-MM-DD), thiếu sẽ trả 400.
   */
  async getServicesByDoctor(
    doctorId: string,
    date: string,
  ): Promise<DoctorServiceItem[]> {
    const res = await apiClient.get(
      `/appointment-booking/doctors/${doctorId}/services`,
      { params: { date } },
    );
    const data = res.data;
    return Array.isArray(data?.services) ? data.services : [];
  },

  /** Các slot thời gian khám còn trống (public). */
  async getAvailableSlots(params: {
    doctorId: string;
    serviceId: string;
    date: string;
  }): Promise<AvailableSlotsResponse> {
    const res = await apiClient.get<AvailableSlotsResponse>(
      `/appointment-booking/doctors/${params.doctorId}/available-slots`,
      { params: { serviceId: params.serviceId, date: params.date } },
    );
    return res.data;
  },

  /**
   * Đặt lịch hẹn khám (cần JWT).
   * Trang công khai /dat-lich KHÔNG gọi trực tiếp hàm này mà gọi qua
   * Route Handler /api/book (đặt hộ bằng JWT lễ tân giữ phía server),
   * vì khách vãng lai chưa có tài khoản.
   */
  async bookAppointment(
    payload: BookAppointmentPayload,
  ): Promise<BookAppointmentResponse> {
    const res = await apiClient.post<BookAppointmentResponse>(
      "/appointment-booking/appointments",
      payload,
    );
    return res.data;
  },

/** Tra cứu lịch hẹn theo mã (public). */
  async getAppointmentByCode(code: string): Promise<AppointmentDetail> {
    const res = await apiClient.get<AppointmentDetail>(
      `/appointment-booking/appointments/code/${encodeURIComponent(normalizeAppointmentCode(code))}`,
    );
    return res.data;
  },

  /** Lịch hẹn của bệnh nhân đang đăng nhập (cần JWT). */
  async getMyAppointments(): Promise<AppointmentDetail[]> {
    const res = await apiClient.get("/appointment-booking/patient/appointments");
    const data = res.data;
    return Array.isArray(data?.appointments) ? data.appointments : [];
  },

  /** Lịch hẹn của bác sĩ đang đăng nhập (cần JWT, vai trò DOCTOR). */
  async getDoctorAppointments(): Promise<AppointmentDetail[]> {
    const res = await apiClient.get(
      "/appointment-booking/doctor/appointments",
    );
    const data = res.data;
    return Array.isArray(data?.appointments) ? data.appointments : [];
  },
};
