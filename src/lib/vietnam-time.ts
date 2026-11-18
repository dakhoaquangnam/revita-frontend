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

export function toVietnamSlotRange(start: string, end: string): string {
  return `${toVietnamTime(start)} - ${toVietnamTime(end)}`;
}
