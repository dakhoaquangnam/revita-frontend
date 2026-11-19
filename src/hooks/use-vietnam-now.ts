import { useEffect, useState } from "react";
import { nowVietnam } from "@/lib/vietnam-time";

/**
 * Giờ hiện tại theo giờ Việt Nam, cập nhật mỗi 60 giây để khung giờ
 * đã qua tự mờ đi mà không cần tải lại trang.
 *
 * Trả null cho tới lần cập nhật đầu tiên (trong useEffect) để tránh đọc
 * new Date() lúc render — Next.js 16 chặn giá trị thời gian không ổn
 * định ở render (hydration mismatch).
 */
export function useVietnamNow(): { date: string; minutes: number } | null {
  const [now, setNow] = useState<{ date: string; minutes: number } | null>(null);

  useEffect(() => {
    setNow(nowVietnam());
    const timer = setInterval(() => setNow(nowVietnam()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return now;
}
