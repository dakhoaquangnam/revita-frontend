import { apiClient } from "@/lib/api";
import {
  clearSession,
  readSession,
  saveSession,
} from "@/lib/session-store";

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  role: "DOCTOR" | "PATIENT" | "RECEPTIONIST" | "ADMIN" | "CASHIER" | "TECHNICIAN";
  avatar?: string | null;
  gender?: string;
  address?: string;
  dateOfBirth?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export const authService = {
  /**
   * Đăng nhập. remember=true (mặc định, theo ô "Ghi nhớ phiên làm việc"):
   * phiên lưu vào localStorage, đóng trình duyệt mở lại vẫn còn. remember=false:
   * phiên chỉ lưu vào sessionStorage, đóng tab là hết. Access token chỉ sống
   * ~1 giờ; apiClient tự làm mới bằng refresh token khi gặp 401.
   */
  async login(payload: LoginPayload, remember = true): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>("/auth/login", payload);
    if (res.data.accessToken && typeof window !== "undefined") {
      saveSession(
        res.data.accessToken,
        res.data.refreshToken,
        res.data.user,
        remember,
      );
    }
    return res.data;
  },

  /**
   * Đăng ký bệnh nhân mới theo đúng luồng OTP của backend:
   * step1 (gửi mã OTP) -> verify-otp -> complete (tạo tài khoản).
   * Không tự bịa tài khoản ở localStorage.
   */
  async registerStep1(payload: {
    phone?: string;
    email?: string;
  }): Promise<{ sessionId: string; message: string }> {
    const res = await apiClient.post("/register/step1", payload);
    return res.data;
  },

  async verifyOtp(payload: {
    otp: string;
    sessionId: string;
  }): Promise<{ sessionId: string; message: string }> {
    const res = await apiClient.post("/register/verify-otp", payload);
    return res.data;
  },

  async completeRegistration(payload: {
    sessionId: string;
    name: string;
    dateOfBirth: string;
    gender: "male" | "female" | "other";
    address: string;
    password: string;
    citizenId?: string;
  }): Promise<{ message: string; userId: string }> {
    const res = await apiClient.post("/register/complete", payload);
    return res.data;
  },

  /** Đăng xuất: xóa phiên ở cả localStorage lẫn sessionStorage. */
  logout(): void {
    clearSession();
  },

  /** Lấy thông tin user hiện tại từ kho phiên đã lưu. */
  getCurrentUser(): UserProfile | null {
    const session = readSession();
    return (session?.user as UserProfile | null) ?? null;
  },

  /** Kiểm tra trạng thái đăng nhập (còn access token trong kho phiên). */
  isAuthenticated(): boolean {
    return !!readSession()?.accessToken;
  },
};
