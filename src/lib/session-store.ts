// Phiên đăng nhập nhân viên — dùng chung cho auth.service, apiClient, use-auth.
// "Ghi nhớ phiên" (remember=true)  -> localStorage: giữ qua lần mở trình duyệt sau.
// Không ghi nhớ (remember=false)   -> sessionStorage: đóng tab là hết phiên.
// Access token của backend chỉ sống ~1 giờ; refresh token dùng để lấy cặp token
// mới qua POST /auth/refresh (xem docs-json trên VPS: RefreshTokenDto { refreshToken }
// -> TokenResponseDto { accessToken, refreshToken }). Không có luồng này thì ô
// "Ghi nhớ phiên" chỉ là trang trí: hết 1 giờ là mọi API trả 401, phải nhập lại.
import axios from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const TOKEN_KEY = "revita_token";
const REFRESH_KEY = "revita_refresh_token";
const USER_KEY = "revita_user";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: unknown;
  remembered: boolean;
}

function getStores(): Array<{ store: Storage; remembered: boolean }> {
  if (typeof window === "undefined") return [];
  return [
    { store: window.localStorage, remembered: true },
    { store: window.sessionStorage, remembered: false },
  ];
}

function safeGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    // Bộ nhớ trình duyệt đầy hoặc bị chặn: phiên chỉ sống trong bộ nhớ RAM.
  }
}

function safeRemove(store: Storage, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    // Bỏ qua.
  }
}

/** Đọc phiên ở cả hai kho (ưu tiên localStorage). */
export function readSession(): StoredSession | null {
  for (const { store, remembered } of getStores()) {
    const accessToken = safeGet(store, TOKEN_KEY);
    if (!accessToken) continue;
    const refreshToken = safeGet(store, REFRESH_KEY) ?? "";
    let user: unknown = null;
    const rawUser = safeGet(store, USER_KEY);
    if (rawUser) {
      try {
        user = JSON.parse(rawUser);
      } catch {
        user = null;
      }
    }
    return { accessToken, refreshToken, user, remembered };
  }
  return null;
}

/** Ghi phiên mới: ghi vào kho đích TRƯỚC rồi mới xóa kho còn lại. Trước đây
 *  xóa cả hai kho trước rồi mới ghi — nếu ghi thất bại (bộ nhớ trình duyệt
 *  bị chặn/đầy) thì phiên cũ mất trắng, tải lại trang là bị đăng xuất. */
export function saveSession(
  accessToken: string,
  refreshToken: string,
  user: unknown,
  remembered: boolean,
): void {
  if (typeof window === "undefined") return;
  const target = remembered ? window.localStorage : window.sessionStorage;
  const other = remembered ? window.sessionStorage : window.localStorage;
  safeSet(target, TOKEN_KEY, accessToken);
  if (refreshToken) safeSet(target, REFRESH_KEY, refreshToken);
  if (user != null) safeSet(target, USER_KEY, JSON.stringify(user));
  // Chỉ xóa kho còn lại sau khi đã ghi xong (tránh trùng phiên hai kho).
  safeRemove(other, TOKEN_KEY);
  safeRemove(other, REFRESH_KEY);
  safeRemove(other, USER_KEY);
}

/** Cập nhật user đã lưu (giữ nguyên kho và token). */
export function updateStoredUser(user: unknown): void {
  const session = readSession();
  if (!session) return;
  const target = session.remembered
    ? window.localStorage
    : window.sessionStorage;
  safeSet(target, USER_KEY, JSON.stringify(user));
}

/** Xóa phiên ở cả hai kho. */
export function clearSession(): void {
  for (const { store } of getStores()) {
    safeRemove(store, TOKEN_KEY);
    safeRemove(store, REFRESH_KEY);
    safeRemove(store, USER_KEY);
  }
}

/** Hạn của access token (ms, theo claim exp của JWT). null = không đọc được. */
export function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    ) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Token đã hết hạn (hoặc sắp hết trong leewaySeconds giây) thì coi như hết. */
export function isTokenExpired(token: string, leewaySeconds = 60): boolean {
  const expMs = getTokenExpiryMs(token);
  if (expMs == null) return true;
  return Date.now() >= expMs - leewaySeconds * 1000;
}

// --- Làm mới token (dùng axios trần, KHÔNG qua apiClient để tránh vòng lặp
// interceptor 401). Nhiều lời gọi đồng thời dùng chung một promise. ---
let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const session = readSession();
    if (!session?.refreshToken) return null;
    try {
      const res = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken: session.refreshToken },
        { timeout: 10000, headers: { "Content-Type": "application/json" } },
      );
      const { accessToken, refreshToken } = res.data;
      if (!accessToken) return null;
      // Giữ nguyên lựa chọn ghi nhớ của phiên cũ (refresh token xoay vòng).
      saveSession(accessToken, refreshToken || session.refreshToken, session.user, session.remembered);
      return accessToken;
    } catch (err) {
      // Chỉ xóa phiên khi backend khẳng định refresh token không hợp lệ
      // hoặc hết hạn (400/401). Lỗi mạng/timeout/lỗi máy chủ thì GIỮ phiên
      // cũ: access token có thể vẫn còn hạn, lần gọi sau sẽ thử làm mới
      // lại — trước đây lỗi nào cũng xóa phiên nên một cú chập chờn mạng
      // lúc tải lại trang là văng người dùng ra trang đăng nhập.
      if (
        axios.isAxiosError(err) &&
        err.response &&
        err.response.status >= 400 &&
        err.response.status < 500
      ) {
        clearSession();
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}
