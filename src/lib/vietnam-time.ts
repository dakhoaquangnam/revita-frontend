/**
 * Giờ Việt Nam cho khung giờ đặt lịch.
 *
 * Backend trả khung giờ dạng "HH:MM" theo giờ UTC (slot tạo bằng
 * getUTCHours() trong appointment-booking.service.ts), còn bệnh nhân xem
 * theo giờ Việt Nam (UTC+7, không có giờ mùa hè nên cộng cố định 7 giờ).
 *
 * CHỈ đổi lúc HIỂN THỊ. Giá trị gửi lên backend lúc đặt lịch vẫn giữ
 * nguyên chuỗi UTC, vì parseAppointmentTime() của backend hiểu chuỗi đó
 * là UTC và lưu đúng thời điểm (vd "02:50" UTC = 09:50 giờ VN).
 */
export function toVietnamTime(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const total = (Number(m[1]) * 60 + Number(m[2]) + 7 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * "HH:MM" UTC -> số phút từ 0h theo giờ Việt Nam (0–1439).
 * Dùng để so sánh khung giờ với giờ hiện tại (vd khung 07:30 VN = 450).
 * Trả -1 nếu chuỗi không đúng dạng.
 */
export function toVietnamMinutes(hhmm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return -1;
  return (Number(m[1]) * 60 + Number(m[2]) + 7 * 60) % (24 * 60);
}

/**
 * Giờ hiện tại theo giờ Việt Nam: { date: "YYYY-MM-DD", minutes }.
 * CHỈ gọi trong useEffect / event handler — không gọi lúc render
 * (Next.js 16 chặn giá trị thời gian không ổn định ở render).
 */
export function nowVietnam(): { date: string; minutes: number } {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return {
    date: `${now.getUTCFullYear()}-${mm}-${dd}`,
    minutes: now.getUTCHours() * 60 + now.getUTCMinutes(),
  };
}

export function toVietnamSlotRange(start: string, end: string): string {
  return `${toVietnamTime(start)} - ${toVietnamTime(end)}`;
}

/**
 * Chuỗi ISO UTC ("2026-11-19T00:30:00.000Z") -> "HH:MM" giờ Việt Nam.
 * Dùng cho dòng mô tả ca trên thẻ bác sĩ (workSessionStart/End backend
 * trả dạng ISO). Hàm thuần túy theo đầu vào nên an toàn lúc render.
 */
export function toVietnamTimeFromISO(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const total = (d.getUTCHours() * 60 + d.getUTCMinutes() + 7 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
