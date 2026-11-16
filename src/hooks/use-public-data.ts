import { useQuery } from "@tanstack/react-query";
import { publicService } from "@/services/public.service";

// TẠM THỜI 16/11: phòng khám mới mở chỉ nhận PHCN — ẩn các chuyên khoa khác
// ở trang chủ + trang đặt lịch (2 nơi duy nhất dùng hook này).
// Muốn mở lại tất cả: xóa bộ lọc dưới đây (giữ nguyên PHCN_SPECIALTY_CODE).
const PHCN_ONLY = true;
const PHCN_SPECIALTY_CODE = "PHUCHOICHUCNANG";

/** Hook lấy danh sách chuyên khoa */
export function useSpecialties() {
  return useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      const list = await publicService.getSpecialties();
      return PHCN_ONLY
        ? list.filter((s) => s.specialtyCode === PHCN_SPECIALTY_CODE)
        : list;
    },
  });
}

/** Hook lấy danh sách bác sĩ */
export function useDoctors() {
  return useQuery({
    queryKey: ["doctors"],
    queryFn: () => publicService.getDoctors(),
  });
}
