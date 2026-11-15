import { apiClient } from "@/lib/api";

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
  /** Đăng nhập */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>("/auth/login", payload);
    if (res.data.accessToken && typeof window !== "undefined") {
      localStorage.setItem("revita_token", res.data.accessToken);
      localStorage.setItem("revita_refresh_token", res.data.refreshToken);
      localStorage.setItem("revita_user", JSON.stringify(res.data.user));
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

  /** Đăng xuất */
  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("revita_token");
      localStorage.removeItem("revita_refresh_token");
      localStorage.removeItem("revita_user");
    }
  },

  /** Lấy thông tin user hiện tại từ local storage */
  getCurrentUser(): UserProfile | null {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem("revita_user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /** Kiểm tra trạng thái đăng nhập */
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("revita_token");
  },
};
