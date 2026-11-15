import { NextRequest, NextResponse } from "next/server";
import {
  RevitaError,
  createPatientProfileAsService,
  bookAppointmentAsService,
} from "@/lib/revita-server";

/**
 * POST /api/book — Đặt lịch hẹn hộ khách vãng lai (phương án B).
 * Tạo hồ sơ bệnh nhân rồi đặt lịch bằng JWT lễ tân giữ phía server.
 * Khách trên trình duyệt không bao giờ thấy JWT này.
 */

// Giới hạn: 5 lần đặt lịch / 10 phút / IP (chống spam đặt hộ).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json(
      { message: "Bạn đã đặt quá nhiều lần. Vui lòng thử lại sau 10 phút." },
      { status: 429 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const dateOfBirth = String(body?.dateOfBirth ?? "").trim();
  const gender = String(body?.gender ?? "").trim();
  // GĐ4 — dị ứng thu ở form đặt lịch, lưu vào hồ sơ bệnh nhân.
  const allergies = String(body?.allergies ?? "").trim() || undefined;
  const doctorId = String(body?.doctorId ?? "").trim();
  const serviceId = String(body?.serviceId ?? "").trim();
  const date = String(body?.date ?? "").trim();
  const startTime = String(body?.startTime ?? "").trim();
  const endTime = String(body?.endTime ?? "").trim();

  if (!name || !phone || !dateOfBirth || !gender || !doctorId || !serviceId || !date || !startTime || !endTime) {
    return NextResponse.json(
      { message: "Thiếu thông tin đặt lịch (họ tên, SĐT, ngày sinh, bác sĩ, dịch vụ, ngày, giờ)." },
      { status: 400 },
    );
  }
  if (!DATE_RE.test(dateOfBirth) || !DATE_RE.test(date) || !TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return NextResponse.json(
      { message: "Ngày phải có dạng YYYY-MM-DD, giờ phải có dạng HH:mm." },
      { status: 400 },
    );
  }

  try {
    // 1. Tạo hồ sơ bệnh nhân (backend bắt buộc có emergencyContact).
    // Chưa có người liên hệ khẩn cấp riêng nên dùng chính SĐT bệnh nhân;
    // lễ tân sẽ xác nhận lại lúc check-in.
    const profile = await createPatientProfileAsService({
      name,
      phone,
      dateOfBirth,
      gender,
      allergies,
      emergencyContactName: name,
      emergencyContactPhone: phone,
    });

    // 2. Đặt lịch với hồ sơ vừa tạo.
    const appointment = await bookAppointmentAsService({
      patientProfileId: profile.id,
      doctorId,
      serviceId,
      date,
      startTime,
      endTime,
    });

    return NextResponse.json(
      {
        appointmentCode: appointment.appointmentCode,
        appointmentId: appointment.appointmentId,
        profileCode: profile.profileCode,
        doctorName: appointment.doctorName,
        patientName: appointment.patientName ?? name,
        serviceName: appointment.serviceName,
        date: appointment.date ?? date,
        startTime: appointment.startTime ?? startTime,
        endTime: appointment.endTime ?? endTime,
        status: appointment.status,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof RevitaError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { message: "Đặt lịch thất bại. Vui lòng thử lại hoặc gọi hotline phòng khám." },
      { status: 500 },
    );
  }
}
