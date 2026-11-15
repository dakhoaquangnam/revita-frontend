import axios from "axios";
import {
  API_BASE_URL,
  clearSession,
  isTokenExpired,
  readSession,
  refreshAccessToken,
} from "@/lib/session-store";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Gắn JWT hiện tại vào mỗi request (đọc từ kho phiên: localStorage nếu ghi nhớ,
// sessionStorage nếu không).
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = readSession()?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Access token chỉ sống ~1 giờ. Gặp 401 thì thử làm mới bằng refresh token rồi
// gọi lại request đúng một lần; làm mới thất bại (refresh cũng hết hạn) thì
// xóa phiên và đưa về trang login (chỉ khi đang ở trong dashboard).
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const url: string = original?.url ?? "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/refresh");
    if (
      status === 401 &&
      original &&
      !original._retried &&
      !isAuthCall &&
      typeof window !== "undefined"
    ) {
      original._retried = true;
      // Token trong kho có thể đã hết hạn từ trước: làm mới rồi thử lại.
      const fresh = await refreshAccessToken();
      if (fresh) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${fresh}`;
        return apiClient(original);
      }
      clearSession();
      const path = window.location.pathname;
      if (path.startsWith("/dashboard") && path !== "/dashboard/login") {
        window.location.replace("/dashboard/login");
      }
    }
    return Promise.reject(error);
  },
);

// Lộ cho use-auth dùng lúc mở app: token hết hạn thì làm mới im lặng.
export async function ensureFreshToken(): Promise<boolean> {
  const session = readSession();
  if (!session?.accessToken) return false;
  if (!isTokenExpired(session.accessToken)) return true;
  return (await refreshAccessToken()) != null;
}
