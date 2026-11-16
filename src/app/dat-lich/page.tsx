"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useSpecialties } from "@/hooks/use-public-data";
import { appointmentService, SERVICE_TECHNICIAN_MAP } from "@/services/appointment.service";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Stethoscope,
  Copy,
  Check,
} from "lucide-react";

function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function slotLabel(start: string, end: string): string {
  return `${start} - ${end}`;
}

export default function DatLichPage() {
  const { data: specialties, isLoading: specialtiesLoading, isError: specialtiesError } =
    useSpecialties();

  const [step, setStep] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  // Form state — dữ liệu thật từ backend
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  // Ngày mặc định = hôm nay — gán trong useEffect để không đọc new Date()
  // lúc prerender (Next.js 16 chặn giá trị thời gian không ổn định ở render).
  const [selectedDate, setSelectedDate] = useState<string>("");
  useEffect(() => {
    setSelectedDate(todayLocal());
  }, []);
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);

  // KTV bệnh nhân chọn ở bước riêng sau khi chọn dịch vụ.
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");

  // Patient info
  const [patientInfo, setPatientInfo] = useState({
    fullName: "",
    phone: "",
    dateOfBirth: "",
    gender: "Nam",
    symptoms: "",
    hasMetalImplant: "Không",
    hasPacemaker: "Không",
    // GĐ4 — dị ứng thu ở form đăng ký (Q7), lưu vào hồ sơ bệnh nhân.
    allergies: "",
  });

  // Kết quả đặt lịch thật
  const [ticketCode, setTicketCode] = useState<string>("");
  const [profileCode, setProfileCode] = useState<string>("");
  const [ticketTechnicianName, setTicketTechnicianName] = useState<string>("");
  const [bookingError, setBookingError] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  const selectedSpecialty = useMemo(
    () => specialties?.find((s) => s.id === selectedSpecialtyId) ?? null,
    [specialties, selectedSpecialtyId],
  );

  // TẠM THỜI: chỉ còn 1 chuyên khoa (PHCN) thì chọn sẵn để bệnh nhân khỏi bấm thêm.
  useEffect(() => {
    if (specialties?.length === 1 && !selectedSpecialtyId) {
      setSelectedSpecialtyId(specialties[0].id);
    }
  }, [specialties, selectedSpecialtyId]);

  // Bác sĩ có lịch làm việc trong ngày theo chuyên khoa
  const {
    data: doctorsData,
    isLoading: doctorsLoading,
    isError: doctorsError,
  } = useQuery({
    queryKey: ["available-doctors", selectedSpecialtyId, selectedDate],
    queryFn: () =>
      appointmentService.getAvailableDoctors({
        specialtyId: selectedSpecialtyId,
        date: selectedDate,
      }),
    enabled: !!selectedSpecialtyId && !!selectedDate,
  });
  const doctors = doctorsData?.doctors ?? [];
  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.doctorId === selectedDoctorId) ?? null,
    [doctors, selectedDoctorId],
  );

  // Dịch vụ của bác sĩ đã chọn (kèm giá thật)
  const { data: doctorServices, isLoading: servicesLoading } = useQuery({
    queryKey: ["doctor-services", selectedDoctorId, selectedDate],
    queryFn: () => appointmentService.getServicesByDoctor(selectedDoctorId, selectedDate),
    enabled: !!selectedDoctorId && !!selectedDate,
  });
  const services = doctorServices ?? [];
  const selectedService = useMemo(
    () => services.find((s) => s.serviceId === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  // Khung giờ còn trống của bác sĩ cho dịch vụ đã chọn
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["available-slots", selectedDoctorId, selectedServiceId, selectedDate],
    queryFn: () =>
      appointmentService.getAvailableSlots({
        doctorId: selectedDoctorId,
        serviceId: selectedServiceId,
        date: selectedDate,
      }),
    enabled: !!selectedDoctorId && !!selectedServiceId && !!selectedDate,
  });
  const slots = (slotsData?.slots ?? []).filter((s) => s.isAvailable);

  // KTV phụ trách dịch vụ đã chọn (bước riêng sau khi chọn dịch vụ).
  // Khám PHCN do bác sĩ làm nên không có bước này.
  const serviceTechnician = useMemo(
    () =>
      selectedService?.serviceCode
        ? SERVICE_TECHNICIAN_MAP[selectedService.serviceCode] ?? null
        : null,
    [selectedService],
  );
  const needsTechnicianStep = !!serviceTechnician;

  const { data: technicians, isLoading: techniciansLoading } = useQuery({
    queryKey: ["technicians"],
    queryFn: () => appointmentService.getTechnicians(),
    enabled: needsTechnicianStep,
  });
  const mappedTechnician = useMemo(
    () => technicians?.find((t) => t.email === serviceTechnician?.email) ?? null,
    [technicians, serviceTechnician],
  );
  // Tự chọn sẵn KTV phụ trách (hiện mỗi dịch vụ chỉ có 1 KTV).
  useEffect(() => {
    if (mappedTechnician && !selectedTechnicianId) {
      setSelectedTechnicianId(mappedTechnician.id);
    }
  }, [mappedTechnician, selectedTechnicianId]);

  const handleNextStep1 = () => {
    if (!selectedSpecialtyId) return;
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!selectedDoctorId || !selectedServiceId || !selectedSlot) return;
    setStep(needsTechnicianStep ? 3 : 4);
  };

  const handleNextStep3 = () => {
    if (!selectedTechnicianId) return;
    setStep(4);
  };

  const handleFinishBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientInfo.fullName || !patientInfo.phone || !patientInfo.dateOfBirth) {
      setBookingError("Vui lòng nhập Họ tên, Số điện thoại và Ngày sinh!");
      return;
    }
    if (!selectedDoctorId || !selectedServiceId || !selectedSlot) {
      setBookingError("Vui lòng chọn lại bác sĩ, dịch vụ và khung giờ.");
      return;
    }
    setIsBooking(true);
    setBookingError("");
    try {
      // Đặt lịch thật qua Route Handler /api/book (đặt hộ bằng JWT lễ tân
      // giữ phía server — khách vãng lai không có tài khoản để tự đặt).
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: patientInfo.fullName,
          phone: patientInfo.phone,
          dateOfBirth: patientInfo.dateOfBirth,
          gender: patientInfo.gender,
          // GĐ4 — dị ứng thu ở form đăng ký, lưu vào hồ sơ bệnh nhân.
          allergies: patientInfo.allergies.trim() || undefined,
          doctorId: selectedDoctorId,
          serviceId: selectedServiceId,
          technicianId: selectedTechnicianId || undefined,
          date: selectedDate,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Đặt lịch thất bại. Vui lòng thử lại.");
      }
      setTicketCode(data.appointmentCode);
      setProfileCode(data.profileCode ?? "");
      setTicketTechnicianName(data.technicianName ?? mappedTechnician?.name ?? "");

      // Lưu biên lai trên máy để tra cứu nhanh (bản gốc nằm trên hệ thống).
      if (typeof window !== "undefined") {
        const historyItem = {
          code: data.appointmentCode,
          service: selectedService?.serviceName ?? "",
          specialty: selectedSpecialty?.name ?? "",
          date: selectedDate,
          time: slotLabel(selectedSlot.startTime, selectedSlot.endTime),
          patientName: patientInfo.fullName,
          phone: patientInfo.phone,
          price: selectedService?.price ?? 0,
          status: data.status ?? "PENDING",
          createdAt: new Date().toISOString(),
        };
        const existing = JSON.parse(localStorage.getItem("revita_bookings") || "[]");
        localStorage.setItem("revita_bookings", JSON.stringify([historyItem, ...existing]));
      }

      setStep(5);
    } catch (err: any) {
      setBookingError(err.message || "Đặt lịch thất bại. Vui lòng thử lại.");
    } finally {
      setIsBooking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fffefc] text-[#222222]">
      <Navbar />

      <main className="flex-1 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header Title */}
          <div className="text-center mb-10">
            <span className="block eyebrow text-[#0f3e17]">
              HỆ THỐNG ĐẶT LỊCH KHÁM THÔNG MINH
            </span>
            <h1 className="text-3xl sm:text-4xl font-display-serif text-[#0f3e17] tracking-[-0.01em] mt-3">
              Đăng ký Lịch khám Phục hồi chức năng
            </h1>
            <p className="text-sm text-[#222222]/80 mt-2">
              Phòng khám Bác sĩ Thanh Sang • 193 Quang Trung, Đại Lộc, Đà Nẵng • Hotline: 0369.117.117
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="bg-[#fffefc] rounded-[14px] p-4 sm:p-5 border border-[#efeeeb] mb-8">
            <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
              <div className={`flex items-center gap-2 ${step >= 1 ? "text-[#0f3e17] font-semibold" : "text-[#222222]/40"}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 1 ? "bg-[#0f3e17] text-[#fffefc]" : "bg-[#efeeeb] text-[#222222]/60"}`}>
                  1
                </span>
                <span className="hidden sm:inline">Chọn Chuyên khoa</span>
              </div>
              <div className={`w-8 sm:w-16 h-0.5 ${step >= 2 ? "bg-[#0f3e17]" : "bg-[#efeeeb]"}`}></div>
              <div className={`flex items-center gap-2 ${step >= 2 ? "text-[#0f3e17] font-semibold" : "text-[#222222]/40"}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 2 ? "bg-[#0f3e17] text-[#fffefc]" : "bg-[#efeeeb] text-[#222222]/60"}`}>
                  2
                </span>
                <span className="hidden sm:inline">Bác sĩ, Dịch vụ & Giờ</span>
              </div>
              <div className={`w-8 sm:w-16 h-0.5 ${step >= 3 ? "bg-[#0f3e17]" : "bg-[#efeeeb]"}`}></div>
              <div className={`flex items-center gap-2 ${step >= 3 ? "text-[#0f3e17] font-semibold" : "text-[#222222]/40"}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 3 ? "bg-[#0f3e17] text-[#fffefc]" : "bg-[#efeeeb] text-[#222222]/60"}`}>
                  3
                </span>
                <span className="hidden sm:inline">Kỹ thuật viên</span>
              </div>
              <div className={`w-8 sm:w-16 h-0.5 ${step >= 4 ? "bg-[#0f3e17]" : "bg-[#efeeeb]"}`}></div>
              <div className={`flex items-center gap-2 ${step >= 4 ? "text-[#0f3e17] font-semibold" : "text-[#222222]/40"}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 4 ? "bg-[#0f3e17] text-[#fffefc]" : "bg-[#efeeeb] text-[#222222]/60"}`}>
                  4
                </span>
                <span className="hidden sm:inline">Hồ sơ người khám</span>
              </div>
              <div className={`w-8 sm:w-16 h-0.5 ${step >= 5 ? "bg-[#0f3e17]" : "bg-[#efeeeb]"}`}></div>
              <div className={`flex items-center gap-2 ${step >= 5 ? "text-[#0f3e17] font-semibold" : "text-[#222222]/40"}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 5 ? "bg-[#0f3e17] text-[#fffefc]" : "bg-[#efeeeb] text-[#222222]/60"}`}>
                  5
                </span>
                <span className="hidden sm:inline">Vé hẹn</span>
              </div>
            </div>
          </div>

          {/* STEP 1: CHỌN CHUYÊN KHOA */}
          {step === 1 && (
            <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] space-y-6">
              <div>
                <h2 className="text-lg font-display-serif text-[#0f3e17]">1. Chọn Chuyên khoa bạn cần điều trị</h2>
                <p className="text-xs text-[#222222]/70 mt-0.5">Chọn đúng nhóm bệnh giúp phòng khám chuẩn bị buồng máy phù hợp.</p>
                {specialtiesLoading ? (
                  <p className="text-sm text-[#222222]/70 mt-4">Đang tải danh sách chuyên khoa...</p>
                ) : specialtiesError || !specialties?.length ? (
                  <div className="mt-4 p-4 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                    Không tải được danh sách chuyên khoa. Kiểm tra kết nối máy chủ rồi{" "}
                    <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">
                      tải lại trang
                    </button>
                    .
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {specialties.map((spec) => (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => setSelectedSpecialtyId(spec.id)}
                        className={`text-left p-3.5 rounded-[14px] border text-sm font-medium transition-colors ${
                          selectedSpecialtyId === spec.id
                            ? "bg-[#e1f4df] border-[#efeeeb] text-[#0f3e17] font-semibold"
                            : "bg-[#fffefc] border-[#efeeeb] text-[#222222] hover:bg-[#efeeeb]/40"
                        }`}
                      >
                        <span className="block">{spec.name}</span>
                        {spec.description && (
                          <span className="block text-xs text-[#222222]/60 font-normal mt-0.5">
                            {spec.description}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep1}
                  disabled={!selectedSpecialtyId}
                  className="inline-flex items-center gap-2 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm px-6 py-3 rounded-[14px] transition-colors disabled:opacity-50"
                >
                  <span>Tiếp tục: Chọn Bác sĩ & Giờ khám</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CHỌN BÁC SĨ, DỊCH VỤ VÀ KHUNG GIỜ */}
          {step === 2 && (
            <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] space-y-6">
              <div>
                <h2 className="text-lg font-display-serif text-[#0f3e17]">1. Chọn ngày khám</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mt-3">
                  <div>
                    <input
                      type="date"
                      value={selectedDate}
                      min={selectedDate || undefined}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedDoctorId("");
                        setSelectedServiceId("");
                        setSelectedSlot(null);
                        setSelectedTechnicianId("");
                      }}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-[#222222]/70">
                      * Phòng khám mở cửa phục vụ từ Thứ 2 đến Chủ nhật. Các ca ngoài giờ (sau 17h30) vui lòng đặt trước 2 tiếng.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#efeeeb]">
                <h2 className="text-lg font-display-serif text-[#0f3e17]">2. Chọn Bác sĩ chuyên khoa phụ trách</h2>
                {doctorsLoading ? (
                  <p className="text-sm text-[#222222]/70 mt-3">Đang tải danh sách bác sĩ...</p>
                ) : doctorsError ? (
                  <p className="text-sm text-rose-700 mt-3">Không tải được danh sách bác sĩ cho ngày này.</p>
                ) : doctors.length === 0 ? (
                  <p className="text-sm text-[#222222]/70 mt-3">
                    Chuyên khoa này không có bác sĩ làm việc vào ngày đã chọn. Vui lòng chọn ngày khác.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3">
                    {doctors.map((d) => (
                      <div
                        key={d.doctorId}
                        onClick={() => {
                          setSelectedDoctorId(d.doctorId);
                          setSelectedServiceId("");
                          setSelectedSlot(null);
                          setSelectedTechnicianId("");
                        }}
                        className={`cursor-pointer p-4 rounded-[14px] border transition-colors ${
                          selectedDoctorId === d.doctorId
                            ? "bg-[#e1f4df] border-[#efeeeb] text-[#0f3e17]"
                            : "bg-[#fffefc] border-[#efeeeb] text-[#222222] hover:bg-[#efeeeb]/30"
                        }`}
                      >
                        <p className="text-sm font-semibold truncate">BS. {d.doctorName}</p>
                        <p className="text-xs text-[#222222]/70">
                          {d.roomName ?? d.boothName ?? ""} • Ca {d.workSessionStart} - {d.workSessionEnd}
                        </p>
                        <span className="inline-block mt-2 text-[11px] font-semibold text-[#0f3e17] bg-[#b1dbb8]/40 px-2 py-0.5 rounded-full">
                          Đánh giá {d.rating} / 5.0
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedDoctorId && (
                <div className="pt-4 border-t border-[#efeeeb]">
                  <h2 className="text-lg font-display-serif text-[#0f3e17]">3. Chọn Dịch vụ khám / Trị liệu</h2>
                  {servicesLoading ? (
                    <p className="text-sm text-[#222222]/70 mt-3">Đang tải dịch vụ...</p>
                  ) : services.length === 0 ? (
                    <p className="text-sm text-[#222222]/70 mt-3">Bác sĩ này chưa có dịch vụ trong ngày đã chọn.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5 mt-3">
                      {services.map((srv) => (
                        <div
                          key={srv.serviceId}
                          onClick={() => {
                            setSelectedServiceId(srv.serviceId);
                            setSelectedSlot(null);
                            setSelectedTechnicianId("");
                          }}
                          className={`cursor-pointer p-4 rounded-[14px] border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            selectedServiceId === srv.serviceId
                              ? "bg-[#e1f4df]/60 border-[#efeeeb]"
                              : "bg-[#fffefc] border-[#efeeeb] hover:bg-[#efeeeb]/30"
                          }`}
                        >
                          <div className="space-y-1">
                            <h3 className="font-semibold text-[#0f3e17] text-sm sm:text-base">{srv.serviceName}</h3>
                            {srv.description && (
                              <p className="text-xs text-[#222222]/75 leading-relaxed">{srv.description}</p>
                            )}
                            {srv.timePerPatient && (
                              <span className="inline-block text-xs text-[#0f3e17] font-semibold">
                                Thời lượng: {srv.timePerPatient} phút
                              </span>
                            )}
                          </div>
                          <div className="text-right sm:shrink-0">
                            <span className="text-base font-display-serif text-[#0f3e17]">
                              {srv.price != null ? `${srv.price.toLocaleString("vi-VN")} đ` : "Liên hệ"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedServiceId && (
                <div className="pt-4 border-t border-[#efeeeb]">
                  <label className="block text-sm font-semibold text-[#0f3e17] mb-2">
                    4. Chọn Khung giờ còn trống
                  </label>
                  {slotsLoading ? (
                    <p className="text-sm text-[#222222]/70">Đang tải khung giờ trống...</p>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-[#222222]/70">
                      Bác sĩ đã kín lịch cho dịch vụ này trong ngày đã chọn. Vui lòng chọn ngày hoặc dịch vụ khác.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {slots.map((slot) => {
                        const label = slotLabel(slot.startTime, slot.endTime);
                        const isSelected =
                          selectedSlot?.startTime === slot.startTime &&
                          selectedSlot?.endTime === slot.endTime;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() =>
                              setSelectedSlot({ startTime: slot.startTime, endTime: slot.endTime })
                            }
                            className={`py-2.5 px-2 rounded-[14px] text-xs font-semibold border transition-colors ${
                              isSelected
                                ? "bg-[#0f3e17] border-transparent text-[#fffefc]"
                                : "bg-[#fffefc] border-[#efeeeb] text-[#222222] hover:bg-[#efeeeb]/40"
                            }`}
                          >
                            <p>{label}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex items-center justify-between border-t border-[#efeeeb]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-[#222222]/70 hover:text-[#0f3e17] text-sm font-semibold px-4 py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep2}
                  disabled={!selectedDoctorId || !selectedServiceId || !selectedSlot}
                  className="inline-flex items-center gap-2 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm px-6 py-3 rounded-[14px] transition-colors disabled:opacity-50"
                >
                  <span>{needsTechnicianStep ? "Tiếp tục: Chọn Kỹ thuật viên" : "Tiếp tục: Nhập thông tin người khám"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CHỌN KỸ THUẬT VIÊN PHỤ TRÁCH (chỉ khi dịch vụ có KTV) */}
          {step === 3 && (
            <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] space-y-6">
              <div>
                <h2 className="text-lg font-display-serif text-[#0f3e17]">3. Chọn Kỹ thuật viên phụ trách</h2>
                <p className="text-xs text-[#222222]/70 mt-0.5">
                  Dịch vụ {selectedService?.serviceName} do kỹ thuật viên {serviceTechnician?.roleLabel} phụ trách.
                </p>
                {techniciansLoading ? (
                  <p className="text-sm text-[#222222]/70 mt-4">Đang tải danh sách kỹ thuật viên...</p>
                ) : !mappedTechnician ? (
                  <div className="mt-4 p-4 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                    Không tải được kỹ thuật viên phụ trách dịch vụ này. Vui lòng quay lại bước trước rồi thử lại, hoặc gọi hotline phòng khám.
                  </div>
                ) : (
                  <div
                    onClick={() => setSelectedTechnicianId(mappedTechnician.id)}
                    className={`cursor-pointer p-4 rounded-[14px] border transition-colors mt-3 ${
                      selectedTechnicianId === mappedTechnician.id
                        ? "bg-[#e1f4df] border-[#efeeeb] text-[#0f3e17]"
                        : "bg-[#fffefc] border-[#efeeeb] text-[#222222] hover:bg-[#efeeeb]/30"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      {serviceTechnician?.prefix}. {mappedTechnician.name}
                    </p>
                    <p className="text-xs text-[#222222]/70 mt-0.5">
                      {serviceTechnician?.roleLabel} • Mã KTV {mappedTechnician.technicianCode}
                    </p>
                    <span className="inline-block mt-2 text-[11px] font-semibold text-[#0f3e17] bg-[#b1dbb8]/40 px-2 py-0.5 rounded-full">
                      Kỹ thuật viên phụ trách buổi trị liệu này
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-[#efeeeb]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 text-[#222222]/70 hover:text-[#0f3e17] text-sm font-semibold px-4 py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep3}
                  disabled={!selectedTechnicianId}
                  className="inline-flex items-center gap-2 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm px-6 py-3 rounded-[14px] transition-colors disabled:opacity-50"
                >
                  <span>Tiếp tục: Nhập thông tin người khám</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: THÔNG TIN BỆNH NHÂN & TIỀN SỬ Y KHOA */}
          {step === 4 && (
            <form onSubmit={handleFinishBooking} className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] space-y-6">
              <div>
                <h2 className="text-lg font-display-serif text-[#0f3e17]">Thông tin hành chính bệnh nhân</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Họ và tên bệnh nhân *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={patientInfo.fullName}
                      onChange={(e) => setPatientInfo({ ...patientInfo, fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Số điện thoại nhận tin nhắn vé hẹn *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0912 345 678"
                      value={patientInfo.phone}
                      onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">Ngày sinh *</label>
                    <input
                      type="date"
                      required
                      value={patientInfo.dateOfBirth}
                      onChange={(e) => setPatientInfo({ ...patientInfo, dateOfBirth: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">Giới tính</label>
                    <select
                      value={patientInfo.gender}
                      onChange={(e) => setPatientInfo({ ...patientInfo, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PHCN Specific Clinical Questions */}
              <div className="pt-4 border-t border-[#efeeeb] space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#0f3e17]" />
                  <h3 className="text-sm font-semibold text-[#0f3e17]">
                    Sàng lọc an toàn Vật lý trị liệu (Bắt buộc)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-[14px] bg-[#e1f4df]/40 border border-[#efeeeb]">
                    <p className="text-xs font-semibold text-[#0f3e17]">
                      Người bệnh có nẹp vít kim loại trong cơ thể không?
                    </p>
                    <p className="text-[11px] text-[#222222]/70 mb-2">Chống chỉ định máy sóng ngắn / vi sóng trị liệu.</p>
                    <div className="flex gap-4 text-xs font-medium">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="metal"
                          value="Không"
                          checked={patientInfo.hasMetalImplant === "Không"}
                          onChange={() => setPatientInfo({ ...patientInfo, hasMetalImplant: "Không" })}
                        />
                        <span>Không</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="metal"
                          value="Có"
                          checked={patientInfo.hasMetalImplant === "Có"}
                          onChange={() => setPatientInfo({ ...patientInfo, hasMetalImplant: "Có" })}
                        />
                        <span>Có (Báo trước cho bác sĩ)</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 rounded-[14px] bg-[#e1f4df]/40 border border-[#efeeeb]">
                    <p className="text-xs font-semibold text-[#0f3e17]">
                      Người bệnh có cấy ghép máy tạo nhịp tim không?
                    </p>
                    <p className="text-[11px] text-[#222222]/70 mb-2">Chống chỉ định các dòng điện xung trị liệu TENS.</p>
                    <div className="flex gap-4 text-xs font-medium">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="pacemaker"
                          value="Không"
                          checked={patientInfo.hasPacemaker === "Không"}
                          onChange={() => setPatientInfo({ ...patientInfo, hasPacemaker: "Không" })}
                        />
                        <span>Không</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="pacemaker"
                          value="Có"
                          checked={patientInfo.hasPacemaker === "Có"}
                          onChange={() => setPatientInfo({ ...patientInfo, hasPacemaker: "Có" })}
                        />
                        <span>Có (Máy tạo nhịp)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                    Dị ứng thuốc / thức ăn (nếu có)
                  </label>
                  <input
                    type="text"
                    value={patientInfo.allergies}
                    onChange={(e) => setPatientInfo({ ...patientInfo, allergies: e.target.value })}
                    placeholder="Ví dụ: Penicillin — nổi mề đay 2023 (để trống nếu không có)"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                  />
                  <p className="text-[11px] text-[#222222]/60 mt-1">
                    * Dị ứng được lưu vào hồ sơ của bạn — bác sĩ dùng để kiểm tra trước khi kê thuốc.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                    Triệu chứng hiện tại & Tiền sử bệnh
                  </label>
                  <textarea
                    rows={2}
                    value={patientInfo.symptoms}
                    onChange={(e) => setPatientInfo({ ...patientInfo, symptoms: e.target.value })}
                    placeholder="Mô tả mức độ đau (thang điểm 1-10), thời gian bị bệnh, đã chụp phim MRI/X-quang chưa..."
                    className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                  ></textarea>
                  <p className="text-[11px] text-[#222222]/60 mt-1">
                    * Triệu chứng này sẽ được bác sĩ ghi nhận lúc khám — hệ thống đặt lịch hiện chưa có
                    trường lưu triệu chứng.
                  </p>
                </div>
              </div>

              {bookingError && (
                <div className="p-3.5 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-between border-t border-[#efeeeb]">
                <button
                  type="button"
                  onClick={() => setStep(needsTechnicianStep ? 3 : 2)}
                  className="inline-flex items-center gap-1.5 text-[#222222]/70 hover:text-[#0f3e17] text-sm font-semibold px-4 py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </button>
                <button
                  type="submit"
                  disabled={isBooking}
                  className="inline-flex items-center gap-2 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm px-6 py-3 rounded-[14px] transition-colors disabled:opacity-50"
                >
                  <span>{isBooking ? "Đang đặt lịch..." : "Hoàn tất & Nhận mã vé hẹn"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: XÁC NHẬN VÉ HẸN */}
          {step === 5 && (
            <div className="space-y-6">
              {/* Success Badge */}
              <div className="bg-[#0f3e17] text-[#fffefc] p-6 rounded-[14px] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-[14px] bg-[#fffefc]/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-[#b1dbb8]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display-serif">Đặt lịch khám thành công!</h2>
                    <p className="text-xs text-[#cfe7d3]">
                      Mã phiếu hẹn đã được cấp và lưu vào hệ thống tiếp đón của Bác sĩ Thanh Sang (193 Quang Trung, Đại Lộc, Đà Nẵng).
                    </p>
                  </div>
                </div>

                <div className="bg-[#fffefc]/10 px-4 py-2 rounded-[14px] border border-[#efeeeb]/20 text-center">
                  <span className="eyebrow block text-[#b1dbb8]">Mã vé hẹn</span>
                  <span className="text-2xl font-display-serif tracking-widest">{ticketCode}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(ticketCode)}
                    className="flex items-center gap-1 mx-auto mt-1 text-[11px] text-[#b1dbb8] hover:text-[#fffefc]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Đã sao chép" : "Sao chép mã"}</span>
                  </button>
                </div>
              </div>

              {/* Ticket Summary */}
              <div className="bg-[#fffefc] rounded-[14px] p-6 border border-[#efeeeb] space-y-4">
                <h3 className="font-display-serif text-[#0f3e17] text-base pb-3 border-b border-[#efeeeb] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0f3e17]" />
                  <span>Phiếu Khám Lượng Giá Điện Tử</span>
                </h3>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between py-1 border-b border-[#efeeeb]/60">
                    <span className="text-[#222222]/70">Người khám:</span>
                    <span className="font-semibold text-[#0f3e17]">{patientInfo.fullName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#efeeeb]/60">
                    <span className="text-[#222222]/70">Số điện thoại:</span>
                    <span className="font-semibold text-[#222222]">{patientInfo.phone}</span>
                  </div>
                  {profileCode && (
                    <div className="flex justify-between py-1 border-b border-[#efeeeb]/60">
                      <span className="text-[#222222]/70">Mã hồ sơ:</span>
                      <span className="font-semibold text-[#222222]">{profileCode}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-[#efeeeb]/60">
                    <span className="text-[#222222]/70">Chuyên khoa:</span>
                    <span className="font-semibold text-[#0f3e17]">{selectedSpecialty?.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#efeeeb]/60">
                    <span className="text-[#222222]/70">Dịch vụ chỉ định:</span>
                    <span className="font-semibold text-[#222222]">{selectedService?.serviceName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#efeeeb]/60">
                    <span className="text-[#222222]/70">Bác sĩ:</span>
                    <span className="font-semibold text-[#222222]">{selectedDoctor?.doctorName}</span>
                  </div>
                  {ticketTechnicianName && (
                    <div className="flex justify-between py-1 border-b border-[#efeeeb]/60">
                      <span className="text-[#222222]/70">Kỹ thuật viên:</span>
                      <span className="font-semibold text-[#222222]">{ticketTechnicianName}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-[#efeeeb]/60">
                    <span className="text-[#222222]/70">Ngày khám:</span>
                    <span className="font-semibold text-[#0f3e17]">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#efeeeb]/60">
                    <span className="text-[#222222]/70">Khung giờ:</span>
                    <span className="font-semibold text-[#0f3e17]">
                      {selectedSlot ? slotLabel(selectedSlot.startTime, selectedSlot.endTime) : ""}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 pt-2">
                    <span className="text-[#222222] font-semibold">Tổng chi phí dự kiến:</span>
                    <span className="text-lg font-display-serif text-[#0f3e17]">
                      {selectedService?.price != null
                        ? `${selectedService.price.toLocaleString("vi-VN")} đ`
                        : "Thanh toán tại quầy"}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#e1f4df]/40 rounded-[14px] border border-[#efeeeb] text-xs text-[#222222]/80 space-y-1">
                  <p className="font-semibold text-[#0f3e17]">Hướng dẫn khi đến phòng khám:</p>
                  <p>1. Đến trước giờ hẹn 10 phút, đưa mã vé <strong>{ticketCode}</strong> tại quầy Lễ tân hoặc màn hình Kiosk để nhận số vào thẳng phòng khám.</p>
                  <p>2. Mang theo phim chụp X-Quang / MRI hoặc giấy ra viện (nếu có).</p>
                  <p>3. Thanh toán chi phí tại quầy thu ngân sau khi khám — hiện phòng khám chưa thu cọc online.</p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center w-full py-2.5 rounded-[14px] border border-[#efeeeb] text-[#0f3e17] hover:bg-[#e1f4df]/30 font-semibold text-xs transition-colors"
                  >
                    Trở về Trang chủ
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
