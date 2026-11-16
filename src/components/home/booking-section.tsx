"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { useSpecialties } from "@/hooks/use-public-data";
import { appointmentService, SERVICE_TECHNICIAN_MAP } from "@/services/appointment.service";

// Ngày hôm nay theo giờ địa phương (gán trong useEffect để không đọc
// new Date() lúc prerender — Next.js 16 chặn giá trị thời gian không ổn định).
function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Mục này là "Khám lượng giá & Tư vấn phác đồ": dịch vụ mặc định của nó là
// Khám PHCN. Nếu bác sĩ có dịch vụ này trong ngày đã chọn thì tự chọn sẵn,
// người dùng vẫn đổi sang dịch vụ khác được.
const EXAM_SERVICE_CODE = "REHAB_EXAM";

export function BookingSection() {
  const { data: specialties } = useSpecialties();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    dateOfBirth: "",
    gender: "Nam",
    specialtyId: "",
    doctorId: "",
    serviceId: "",
    technicianId: "",
    date: "",
    slot: "",
    symptoms: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [ticket, setTicket] = useState<{
    appointmentCode: string;
    profileCode: string;
    doctorName: string;
    technicianName: string;
    serviceName: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, date: todayLocal() }));
  }, []);

  // TẠM THỜI: chỉ còn 1 chuyên khoa (PHCN) thì chọn sẵn để bệnh nhân khỏi bấm thêm.
  useEffect(() => {
    if (specialties?.length === 1 && !formData.specialtyId) {
      setFormData((prev) => ({ ...prev, specialtyId: specialties[0].id }));
    }
  }, [specialties, formData.specialtyId]);

  // Bác sĩ có lịch làm việc trong ngày theo chuyên khoa đã chọn.
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ["home-available-doctors", formData.specialtyId, formData.date],
    queryFn: () =>
      appointmentService.getAvailableDoctors({
        specialtyId: formData.specialtyId,
        date: formData.date,
      }),
    enabled: !!formData.specialtyId && !!formData.date,
  });
  const doctors = doctorsData?.doctors ?? [];

  // "Bác sĩ khám bất kỳ" = bác sĩ đầu tiên có lịch trong ngày đó.
  const effectiveDoctorId = formData.doctorId || doctors[0]?.doctorId || "";
  const effectiveDoctor = useMemo(
    () => doctors.find((d) => d.doctorId === effectiveDoctorId) ?? null,
    [doctors, effectiveDoctorId],
  );

  // Dịch vụ của bác sĩ trong ngày đã chọn (kèm giá thật).
  const { data: doctorServices, isLoading: servicesLoading } = useQuery({
    queryKey: ["home-doctor-services", effectiveDoctorId, formData.date],
    queryFn: () =>
      appointmentService.getServicesByDoctor(effectiveDoctorId, formData.date),
    enabled: !!effectiveDoctorId && !!formData.date,
  });
  const services = doctorServices ?? [];

  // Tự chọn sẵn dịch vụ Khám PHCN khi có; không có thì để người dùng chọn.
  useEffect(() => {
    if (services.length === 0) return;
    if (services.some((s) => s.serviceId === formData.serviceId)) return;
    const exam = services.find((s) => s.serviceCode === EXAM_SERVICE_CODE);
    if (exam) {
      setFormData((prev) => ({ ...prev, serviceId: exam.serviceId, slot: "" }));
    }
  }, [services, formData.serviceId]);

  const selectedService = useMemo(
    () => services.find((s) => s.serviceId === formData.serviceId) ?? null,
    [services, formData.serviceId],
  );

  // KTV phụ trách dịch vụ đã chọn (hiện ngay dưới ô chọn dịch vụ).
  // Khám PHCN do bác sĩ làm nên không có KTV.
  const serviceTechnician = useMemo(
    () =>
      selectedService?.serviceCode
        ? SERVICE_TECHNICIAN_MAP[selectedService.serviceCode] ?? null
        : null,
    [selectedService],
  );
  const needsTechnicianStep = !!serviceTechnician;

  const { data: technicians } = useQuery({
    queryKey: ["home-technicians"],
    queryFn: () => appointmentService.getTechnicians(),
    enabled: needsTechnicianStep,
  });
  const mappedTechnician = useMemo(
    () => technicians?.find((t) => t.email === serviceTechnician?.email) ?? null,
    [technicians, serviceTechnician],
  );
  // Tự chọn sẵn KTV phụ trách (hiện mỗi dịch vụ chỉ có 1 KTV).
  useEffect(() => {
    if (mappedTechnician && !formData.technicianId) {
      setFormData((prev) => ({ ...prev, technicianId: mappedTechnician.id }));
    }
  }, [mappedTechnician, formData.technicianId]);

  // Khung giờ còn trống của bác sĩ cho dịch vụ đã chọn.
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["home-available-slots", effectiveDoctorId, formData.serviceId, formData.date],
    queryFn: () =>
      appointmentService.getAvailableSlots({
        doctorId: effectiveDoctorId,
        serviceId: formData.serviceId,
        date: formData.date,
      }),
    enabled: !!effectiveDoctorId && !!formData.serviceId && !!formData.date,
  });
  const slots = (slotsData?.slots ?? []).filter((s) => s.isAvailable);

  const resetAfterSpecialtyOrDate = () =>
    setFormData((prev) => ({ ...prev, doctorId: "", serviceId: "", technicianId: "", slot: "" }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.dateOfBirth) {
      setSubmitError("Vui lòng nhập Họ tên, Số điện thoại và Ngày sinh.");
      return;
    }
    if (!effectiveDoctorId || !formData.serviceId || !formData.slot) {
      setSubmitError("Vui lòng chọn đủ chuyên khoa, bác sĩ, dịch vụ và khung giờ còn trống.");
      return;
    }
    const [startTime, endTime] = formData.slot.split(" - ");
    if (!startTime || !endTime) {
      setSubmitError("Khung giờ đã chọn không hợp lệ. Vui lòng chọn lại.");
      return;
    }

    setLoading(true);
    try {
      // Đặt lịch thật qua Route Handler /api/book (đặt hộ bằng JWT lễ tân
      // giữ phía server — khách vãng lai không có tài khoản để tự đặt).
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          doctorId: effectiveDoctorId,
          serviceId: formData.serviceId,
          technicianId: formData.technicianId || undefined,
          date: formData.date,
          startTime,
          endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Đặt lịch thất bại. Vui lòng thử lại.");
      }
      setTicket({
        appointmentCode: data.appointmentCode,
        profileCode: data.profileCode ?? "",
        doctorName: data.doctorName ?? effectiveDoctor?.doctorName ?? "",
        technicianName: data.technicianName ?? mappedTechnician?.name ?? "",
        serviceName: data.serviceName ?? selectedService?.serviceName ?? "",
        date: data.date ?? formData.date,
        startTime: data.startTime ?? startTime,
        endTime: data.endTime ?? endTime,
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || "Đặt lịch thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setTicket(null);
    setSubmitError("");
    setCopied(false);
    setFormData((prev) => ({ ...prev, slot: "" }));
  };

  return (
    <section id="dat-lich" className="py-24 bg-[#fffefc] border-b border-[#efeeeb] scroll-mt-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#e1f4df] rounded-[14px] p-8 sm:p-12 border border-[#efeeeb]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Info */}
            <div className="lg:col-span-5 space-y-6">
              <h2 className="text-3xl sm:text-4xl font-display-serif text-[#0f3e17] tracking-[-0.01em] leading-tight">
                Đặt lịch Khám lượng giá & Tư vấn phác đồ
              </h2>

              <p className="text-[#222222]/80 text-sm leading-relaxed font-normal">
                Chủ động chọn giờ khám, giảm thiểu tối đa thời gian chờ đợi tại phòng khám. Bác sĩ chuyên khoa sẽ liên hệ xác nhận thông tin trước buổi khám.
              </p>

              <div className="space-y-3.5 pt-2 text-sm text-[#222222]">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0f3e17] shrink-0" />
                  <span>Ưu tiên số thứ tự vào buồng khám đúng giờ</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0f3e17] shrink-0" />
                  <span>Bác sĩ trực tiếp thăm khám và đo tầm vận động</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0f3e17] shrink-0" />
                  <span>Tặng kèm tài liệu hướng dẫn bài tập phục hồi tại nhà</span>
                </div>
              </div>

              <div className="pt-6 border-t border-[#efeeeb] flex items-center gap-3 text-xs text-[#0f3e17]">
                <span>Hotline hỗ trợ:</span>
                <a href="tel:0369117117" className="text-[#0f3e17] font-semibold text-base hover:text-[#0c2f10] transition-colors">
                  0369.117.117
                </a>
              </div>
            </div>

            {/* Right Booking Form */}
            <div className="lg:col-span-7 bg-[#fffefc] text-[#222222] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb]">
              {isSubmitted && ticket ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-[14px] bg-[#e1f4df] text-[#0f3e17] flex items-center justify-center mx-auto border border-[#efeeeb]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-display-serif text-[#0f3e17]">
                    Đăng ký lịch khám thành công!
                  </h3>
                  <p className="text-sm text-[#222222]/80 max-w-md mx-auto leading-relaxed">
                    Cảm ơn bạn <strong>{formData.fullName}</strong>. Lịch hẹn{" "}
                    <strong>
                      {ticket.serviceName} — BS. {ticket.doctorName}
                      {ticket.technicianName ? ` — KTV ${ticket.technicianName}` : ""}
                    </strong>{" "}
                    vào ngày <strong>{ticket.date}</strong> ({ticket.startTime} - {ticket.endTime})
                    đã được ghi vào hệ thống. Nhân viên y tế sẽ gọi điện thoại tới số{" "}
                    <strong>{formData.phone}</strong> để xác nhận trong ít phút.
                  </p>
                  <div className="bg-[#e1f4df]/40 px-4 py-3 rounded-[14px] border border-[#efeeeb] inline-flex flex-col items-center gap-1">
                    <span className="eyebrow text-[#0f3e17]/70">
                      Mã vé hẹn
                    </span>
                    <span className="text-2xl font-display-serif tracking-widest text-[#0f3e17]">
                      {ticket.appointmentCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(ticket.appointmentCode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 text-[11px] text-[#0f3e17] hover:underline"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Đã sao chép" : "Sao chép mã"}</span>
                    </button>
                    {ticket.profileCode && (
                      <span className="text-[11px] text-[#222222]/60">
                        Mã hồ sơ: <span className="font-semibold">{ticket.profileCode}</span>
                      </span>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center justify-center text-xs font-semibold text-[#0f3e17] bg-[#e1f4df] hover:bg-[#cfe7d3] px-5 py-2.5 rounded-[14px] transition-colors"
                    >
                      Đặt thêm lịch hẹn khác
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-display-serif text-[#0f3e17] pb-2 border-b border-[#efeeeb]">
                    Thông tin người khám
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Họ và tên bệnh nhân *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#222222]/40 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="Nguyễn Văn A"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Số điện thoại liên hệ *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#222222]/40 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="0912 345 678"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Ngày sinh *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Giới tính
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Chuyên khoa cần khám
                      </label>
                      <select
                        value={formData.specialtyId}
                        onChange={(e) => {
                          setFormData({ ...formData, specialtyId: e.target.value });
                          resetAfterSpecialtyOrDate();
                        }}
                        className="w-full px-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                      >
                        <option value="">-- Chọn chuyên khoa --</option>
                        {specialties?.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Bác sĩ mong muốn (Tùy chọn)
                      </label>
                      <select
                        value={formData.doctorId}
                        disabled={!formData.specialtyId || doctorsLoading}
                        onChange={(e) => {
                          setFormData({ ...formData, doctorId: e.target.value, serviceId: "", technicianId: "", slot: "" });
                        }}
                        className="w-full px-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all disabled:opacity-60"
                      >
                        <option value="">-- Bác sĩ khám bất kỳ --</option>
                        {doctors.map((d) => (
                          <option key={d.doctorId} value={d.doctorId}>
                            BS. {d.doctorName}
                          </option>
                        ))}
                      </select>
                      {formData.specialtyId && !doctorsLoading && doctors.length === 0 && (
                        <p className="text-[11px] text-rose-700 mt-1">
                          Chuyên khoa này không có bác sĩ làm việc vào ngày đã chọn. Vui lòng chọn ngày khác.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Dịch vụ khám
                      </label>
                      <select
                        value={formData.serviceId}
                        disabled={!effectiveDoctorId || servicesLoading}
                        onChange={(e) => setFormData({ ...formData, serviceId: e.target.value, technicianId: "", slot: "" })}
                        className="w-full px-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all disabled:opacity-60"
                      >
                        <option value="">-- Chọn dịch vụ --</option>
                        {services.map((s) => (
                          <option key={s.serviceId} value={s.serviceId}>
                            {s.serviceName}
                            {s.price != null ? ` — ${s.price.toLocaleString("vi-VN")} đ` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Ngày khám mong muốn
                      </label>
                      <div className="relative">
                        <CalendarIcon className="w-4 h-4 text-[#222222]/40 absolute left-3 top-3" />
                        <input
                          type="date"
                          value={formData.date}
                          min={formData.date || undefined}
                          onChange={(e) => {
                            setFormData({ ...formData, date: e.target.value });
                            resetAfterSpecialtyOrDate();
                          }}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {needsTechnicianStep && mappedTechnician && (
                    <div className="p-3.5 rounded-[14px] bg-[#e1f4df]/40 border border-[#efeeeb] text-sm">
                      <span className="text-xs font-semibold text-[#0f3e17]">
                        Kỹ thuật viên phụ trách:{" "}
                      </span>
                      <span className="font-semibold text-[#0f3e17]">
                        {serviceTechnician?.prefix}. {mappedTechnician.name}
                      </span>
                      <span className="text-xs text-[#222222]/70">
                        {" "}• {serviceTechnician?.roleLabel} • Mã KTV {mappedTechnician.technicianCode}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Khung giờ khám
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-[#222222]/40 absolute left-3 top-3" />
                      <select
                        value={formData.slot}
                        disabled={!formData.serviceId || slotsLoading}
                        onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all disabled:opacity-60"
                      >
                        <option value="">-- Chọn khung giờ còn trống --</option>
                        {slots.map((s) => (
                          <option key={`${s.startTime} - ${s.endTime}`} value={`${s.startTime} - ${s.endTime}`}>
                            {s.startTime} - {s.endTime}
                          </option>
                        ))}
                      </select>
                    </div>
                    {formData.serviceId && !slotsLoading && slots.length === 0 && (
                      <p className="text-[11px] text-rose-700 mt-1">
                        Bác sĩ đã kín lịch cho dịch vụ này trong ngày đã chọn. Vui lòng chọn ngày hoặc dịch vụ khác.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Mô tả triệu chứng / Bệnh sử ban đầu
                    </label>
                    <textarea
                      rows={2}
                      value={formData.symptoms}
                      onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                      placeholder="Ví dụ: Đau mỏi thắt lưng lan xuống mông đã 2 tháng; hoặc phục hồi chức năng vận động sau phẫu thuật..."
                      className="w-full px-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                    ></textarea>
                    <p className="text-[11px] text-[#222222]/60 mt-1">
                      * Triệu chứng này sẽ được bác sĩ ghi nhận lúc khám — hệ thống đặt lịch hiện chưa có
                      trường lưu triệu chứng.
                    </p>
                  </div>

                  {submitError && (
                    <div className="p-3.5 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm py-3.5 rounded-[14px] transition-colors disabled:opacity-50 mt-2"
                  >
                    {loading ? "Đang gửi đăng ký..." : "Xác nhận đặt lịch khám"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
