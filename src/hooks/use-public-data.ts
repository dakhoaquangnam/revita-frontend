import { useQuery } from "@tanstack/react-query";
import { publicService } from "@/services/public.service";

/** Hook lấy danh sách chuyên khoa */
export function useSpecialties() {
  return useQuery({
    queryKey: ["specialties"],
    queryFn: () => publicService.getSpecialties(),
  });
}

/** Hook lấy danh sách bác sĩ */
export function useDoctors() {
  return useQuery({
    queryKey: ["doctors"],
    queryFn: () => publicService.getDoctors(),
  });
}
