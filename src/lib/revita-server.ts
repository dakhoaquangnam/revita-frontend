// Gọi API Revita (NestJS) — CHỈ CHẠY PHÍA SERVER.
// Đây là nơi duy nhất trong app này được phép dùng JWT lễ tân để đặt lịch hộ
// khách vãng lai (phương án B — xem báo cáo revita-api-cho-web-cong-khai).
// Không bao giờ import file này từ Client Component.
import "server-only";

const BASE = (
  process.env.REVITA_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000/api"
).replace(/\/$/, "");

export class RevitaError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "RevitaError";
    this.status = status;
  }
}

async function revitaFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new RevitaError("Không kết nối được máy chủ Revita", 502);
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { message?: string | string[] };
      detail = Array.isArray(body.message)
        ? body.message.join("; ")
        : (body.message ?? "");
    } catch {
      // bỏ qua, dùng message mặc định
    }
    throw new RevitaError(detail || `Revita trả lỗi ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

/* ---------------- Tài khoản dịch vụ (phương án B) ----------------
   Một tài khoản RECEPTIONIST của phòng khám, chỉ nằm trong biến môi trường
   phía server (REVITA_SERVICE_EMAIL / REVITA_SERVICE_PASSWORD).
   Backend không kiểm tra người đặt có sở hữu hồ sơ hay không, nên JWT này
   đặt được lịch cho bất kỳ hồ sơ nào — vì vậy phải giữ quyền tối thiểu
   (RECEPTIONIST, không ADMIN) và không bao giờ để lọt ra trình duyệt. */

interface TokenCache {
  token: string;
  expMs: number;
}
let tokenCache: TokenCache | null = null;

function jwtExpMs(token: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    ) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : Date.now() + 50 * 60 * 1000;
  } catch {
    return Date.now() + 50 * 60 * 1000;
  }
}

export async function getServiceToken(): Promise<string> {
  const email = process.env.REVITA_SERVICE_EMAIL;
  const password = process.env.REVITA_SERVICE_PASSWORD;
  if (!email || !password) {
    throw new RevitaError(
      "Chưa cấu hình tài khoản dịch vụ đặt lịch (REVITA_SERVICE_EMAIL/PASSWORD)",
      503,
    );
  }
  if (tokenCache && Date.now() < tokenCache.expMs - 5 * 60 * 1000) {
    return tokenCache.token;
  }
  const data = await revitaFetch<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password }),
  });
  if (!data.accessToken) {
    throw new RevitaError("Đăng nhập tài khoản dịch vụ thất bại", 502);
  }
  tokenCache = { token: data.accessToken, expMs: jwtExpMs(data.accessToken) };
  return data.accessToken;
}

export interface BookingPatientInput {
  name: string;
  phone: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: string;
  // GĐ4 — dị ứng thu ở form đăng ký, lưu vào hồ sơ bệnh nhân.
  allergies?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export async function createPatientProfileAsService(
  input: BookingPatientInput,
): Promise<{ id: string; profileCode?: string }> {
  const token = await getServiceToken();
  return revitaFetch<{ id: string; profileCode?: string }>("/patient-profiles", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: input.name,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      allergies: input.allergies,
      emergencyContact: {
        name: input.emergencyContactName,
        phone: input.emergencyContactPhone,
      },
    }),
  });
}

export interface BookAppointmentResult {
  appointmentId?: string;
  appointmentCode: string;
  doctorName?: string;
  technicianName?: string;
  patientName?: string;
  serviceName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

export async function bookAppointmentAsService(input: {
  patientProfileId: string;
  doctorId: string;
  serviceId: string;
  technicianId?: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<BookAppointmentResult> {
  const token = await getServiceToken();
  return revitaFetch<BookAppointmentResult>("/appointment-booking/appointments", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

/* ---------------- Bài viết công khai (SEO) ----------------
   Trang /bai-viet/[slug] là Server Component: lấy bài phía server để
   nội dung có sẵn trong HTML trả về (Google lập chỉ mục được), thay vì
   fetch ở trình duyệt như trước. cache() để generateMetadata + trang
   dùng chung 1 lần gọi trong cùng một lần render. */
import { cache } from "react";
import type { PostItem } from "@/services/post.service";

export const getPostBySlug = cache(
  async (slug: string): Promise<PostItem | null> => {
    try {
      const data = await revitaFetch<{ post?: PostItem } | PostItem>(
        `/posts/${encodeURIComponent(slug)}`,
      );
      if (data && typeof data === "object" && "post" in data && data.post) {
        return data.post;
      }
      return data as PostItem;
    } catch (err) {
      if (err instanceof RevitaError && err.status === 404) return null;
      throw err;
    }
  },
);

/** Danh sách bài đã xuất bản (cho sitemap). */
export async function getPublishedPosts(limit = 100): Promise<PostItem[]> {
  try {
    const data = await revitaFetch<{ items?: PostItem[] } | PostItem[]>(
      `/posts?limit=${limit}`,
    );
    if (Array.isArray(data)) return data;
    return data.items ?? [];
  } catch {
    return [];
  }
}
