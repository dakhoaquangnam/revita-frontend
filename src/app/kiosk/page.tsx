"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  UserCheck,
  Accessibility,
  Printer,
  Maximize2,
  Minimize2,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Volume2,
  CalendarCheck,
} from "lucide-react";
import { receptionistService } from "@/services/receptionist.service";
import {
  appointmentService,
  PatientProfileSummary,
} from "@/services/appointment.service";
import { ttsService } from "@/services/tts.service";
import { TsLogo } from "@/components/ui/ts-logo";

type KioskMode = "HOME" | "APPOINTMENT" | "PRIORITY" | "REGULAR" | "SUCCESS";

export default function KioskPage() {
  const [mode, setMode] = useState<KioskMode>("HOME");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Input bàn phím ảo cho chế độ đặt hẹn
  const [appointmentCodeInput, setAppointmentCodeInput] = useState("");

  // Dữ liệu cho chế độ Thường & Ưu tiên
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [birthYear, setBirthYear] = useState("1960");
  // GĐ4 — dị ứng thu ở form kiosk (Q7), lưu vào hồ sơ nếu tra được hồ sơ.
  const [allergies, setAllergies] = useState("");
  const [selectedService, setSelectedService] = useState("Khám Lượng giá Chức năng Ban đầu");
  const [priorityType, setPriorityType] = useState<"ELDERLY" | "DISABLED" | "PREGNANT">("ELDERLY");

  // Kết quả cấp vé
  const [ticketResult, setTicketResult] = useState<any | null>(null);
  const [countdown, setCountdown] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Cập nhật đồng hồ thời gian thực
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tự động đếm ngược quay về Home khi hoàn tất
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mode === "SUCCESS") {
      setCountdown(8);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleResetToHome();
            return 8;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode]);

  // Phát âm thanh hướng dẫn bằng giọng VieNeu TTS (hoặc fallback trình duyệt)
  const speakVoice = (text: string) => {
    ttsService.speak(text);
  };

  // Toggle Toàn màn hình
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleResetToHome = () => {
    setMode("HOME");
    setAppointmentCodeInput("");
    setPatientName("");
    setPatientPhone("");
    setTicketResult(null);
    setErrorMsg("");
  };

  const handleKeypadPress = (key: string) => {
    if (key === "CLEAR") {
      setAppointmentCodeInput("");
    } else if (key === "BACK") {
      // Xóa từng ký tự; đang chỉ còn tiền tố "APT-" thì xóa hẳn.
      setAppointmentCodeInput((prev) => (prev === "APT-" ? "" : prev.slice(0, -1)));
    } else if (key === "APT") {
      // Chạm vào APT thì tự điền tiền tố "APT-" để bệnh nhân chỉ cần nhập thêm số.
      setAppointmentCodeInput((prev) => (prev.startsWith("APT-") ? prev : "APT-"));
    } else {
      // Chỉ nhập số: sau "APT-" tối đa 13 số (APT- + timestamp), SĐT tối đa 11 số.
      setAppointmentCodeInput((prev) => {
        const maxLen = prev.startsWith("APT-") ? 17 : 11;
        if (prev.length >= maxLen) return prev;
        return prev + key;
      });
    }
  };

  const handleConfirmAppointment = async () => {
    const raw = appointmentCodeInput.trim();
    if (!raw) return;
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      // Chỉ nhập số (không có tiền tố APT-) = số điện thoại -> lấy số theo SĐT.
      if (/^[0-9]{9,11}$/.test(raw)) {
        const res = await receptionistService.takeNumber({
          patientPhone: raw,
          counterCode: "CTR003",
        });
        if (!res?.ticket) {
          throw new Error("Backend không trả về số thứ tự.");
        }
        const ticket = res.ticket;
        setTicketResult({
          ...ticket,
          type: "APPOINTMENT",
          typeName: "Khám theo lịch hẹn",
          roomName: "Quầy Tiếp Nhận 3 — Đặt lịch trước",
        });
        setMode("SUCCESS");
        speakVoice(
          `Đã xác nhận lịch hẹn thành công. Số thứ tự của Quý khách là ${ticket.queueNumber}. Xin mời đến quầy tiếp đón.`,
        );
        return;
      }
      // Tra cứu lịch hẹn thật trước để lấy đúng tên/SĐT/tuổi/ưu tiên của bệnh nhân.
      const code = raw.toUpperCase();
      const apt = await appointmentService.getAppointmentByCode(code);
      const profile: PatientProfileSummary = apt.patientProfile ?? {
        id: "",
        profileCode: "",
        name: "",
      };
      const dob = profile.dateOfBirth ? new Date(profile.dateOfBirth) : null;
      const age = dob
        ? new Date().getFullYear() - dob.getFullYear()
        : undefined;
      const res = await receptionistService.takeNumber({
        appointmentCode: code,
        patientName: profile.name ?? "",
        patientPhone: profile.phone ?? undefined,
        patientAge: age,
        birthYear: dob ? dob.getFullYear() : undefined,
        isDisabled: Boolean(profile.isDisabled),
        isPregnant: Boolean(profile.isPregnant),
        isElderly: age != null ? age >= 75 : undefined,
        counterCode: "CTR003",
      });

      if (!res?.ticket) {
        throw new Error("Backend không trả về số thứ tự.");
      }
      const ticket = res.ticket;

      setTicketResult({
        ...ticket,
        type: "APPOINTMENT",
        typeName: "Khám theo lịch hẹn trực tuyến",
        roomName: "Quầy Tiếp Nhận 3 — Đặt lịch trước",
      });

      setMode("SUCCESS");
      speakVoice(
        `Đã xác nhận lịch hẹn thành công. Số thứ tự của Quý khách là ${ticket.queueNumber}. Xin mời đến quầy tiếp đón.`
      );
    } catch (err: any) {
      // Lỗi thì báo lỗi — KHÔNG được bịa số thứ tự giả rồi báo thành công.
      const msg =
        err.response?.status === 404
          ? "Không tìm thấy lịch hẹn với mã này. Vui lòng kiểm tra lại mã vé hoặc đến quầy tiếp đón để được hỗ trợ."
          : err.response?.data?.message ||
              "Hệ thống đang bận, chưa cấp được số thứ tự. Vui lòng đến quầy tiếp đón để được hỗ trợ.";
      setErrorMsg(msg);
      speakVoice(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPriority = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const birth = parseInt(birthYear, 10) || 1960;
      const age = new Date().getFullYear() - birth;
      const res = await receptionistService.takeNumber({
        patientName: patientName.trim() || "Bệnh nhân Ưu tiên",
        patientPhone: patientPhone.trim() || undefined,
        birthYear: birth,
        allergies: allergies.trim() || undefined,
        patientAge: age,
        isDisabled: priorityType === "DISABLED",
        isElderly: priorityType === "ELDERLY",
        isPregnant: priorityType === "PREGNANT",
        counterCode: "CTR001",
      });

      if (!res?.ticket) {
        throw new Error("Backend không trả về số thứ tự.");
      }
      const ticket = res.ticket;

      const priorityLabel =
        priorityType === "ELDERLY"
          ? "Ưu tiên Người cao tuổi"
          : priorityType === "DISABLED"
          ? "Ưu tiên Người khuyết tật / Liệt"
          : "Ưu tiên Phụ nữ mang thai";

      setTicketResult({
        ...ticket,
        type: "PRIORITY",
        typeName: priorityLabel,
        roomName: "Quầy Tiếp Nhận 1",
      });

      setMode("SUCCESS");
      speakVoice(
        `Đã lấy số ưu tiên thành công. Số thứ tự của Quý khách là ${ticket.queueNumber}. Xin mời đến quầy tiếp đón.`
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Hệ thống đang bận, chưa cấp được số thứ tự. Vui lòng đến quầy tiếp đón để được hỗ trợ.";
      setErrorMsg(msg);
      speakVoice(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRegular = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const birth = parseInt(birthYear, 10) || 1960;
      const age = new Date().getFullYear() - birth;
      const res = await receptionistService.takeNumber({
        patientName: patientName.trim() || "Bệnh nhân Vãng lai",
        patientPhone: patientPhone.trim() || undefined,
        birthYear: birth,
        allergies: allergies.trim() || undefined,
        patientAge: age,
        counterCode: "CTR002",
      });

      if (!res?.ticket) {
        throw new Error("Backend không trả về số thứ tự.");
      }
      const ticket = res.ticket;

      setTicketResult({
        ...ticket,
        type: "REGULAR",
        typeName: selectedService,
        roomName: "Quầy Tiếp Nhận 2",
      });

      setMode("SUCCESS");
      speakVoice(
        `Đã lấy số thứ tự thành công. Số thứ tự của Quý khách là ${ticket.queueNumber}. Xin mời nhận phiếu tiếp đón.`
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Hệ thống đang bận, chưa cấp được số thứ tự. Vui lòng đến quầy tiếp đón để được hỗ trợ.";
      setErrorMsg(msg);
      speakVoice(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffefc] text-[#222222] flex flex-col justify-between select-none relative font-sans">
      {/* TOP HEADER: Branding & Clock & Fullscreen */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-[#efeeeb] bg-[#fffefc] z-20">
        <div className="flex items-center gap-4">
          <TsLogo size="lg" showText={false} />
          <div>
            <h1 className="font-display-serif text-2xl tracking-tight text-[#0f3e17] flex items-center gap-2">
              THANH SANG{" "}
              <span className="font-sans text-[#0f3e17] bg-[#e1f4df] font-semibold text-xs px-2.5 py-0.5 rounded-full">
                KIOSK
              </span>
            </h1>
            <p className="eyebrow text-[#222222]/60 mt-0.5">
              Cây Tự Bốc Số Tiếp Đón • 193 Quang Trung, Đại Lộc, Đà Nẵng
            </p>
          </div>
        </div>

        {/* Digital Clock */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="font-display-serif text-3xl tracking-tight text-[#0f3e17]">
              {currentTime || "08:30:00"}
            </div>
            <div className="text-xs text-[#222222]/60 capitalize font-medium">
              {currentDate || "Thứ năm, ngày 12 tháng 11 năm 2026"}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-3.5 rounded-[14px] bg-[#fffefc] hover:bg-[#e1f4df]/40 border border-[#efeeeb] text-[#0f3e17] transition-colors"
            title="Bật / Tắt Toàn màn hình Kiosk"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col justify-center px-6 sm:px-12 py-8 max-w-6xl mx-auto w-full z-10">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium text-center">
            {errorMsg}
          </div>
        )}
        {/* ===================== MODE: HOME (3 BIG CARDS) ===================== */}
        {mode === "HOME" && (
          <div className="space-y-10">
            <div className="text-center space-y-2">
              <span className="eyebrow block text-[#0f3e17]">
                Vui lòng chạm vào màn hình để chọn nhu cầu tiếp đón
              </span>
              <h2 className="font-display-serif text-3xl sm:text-4xl tracking-tight text-[#0f3e17]">
                Kính Chào Quý Khách Đến Phòng Khám Bác Sĩ Thanh Sang
              </h2>
              <p className="text-sm text-[#222222]/70 max-w-xl mx-auto">
                193 Quang Trung, Đại Lộc, Đà Nẵng • Phân luồng thông minh, vào khám đúng giờ
              </p>
            </div>

            {/* 3 Main Kiosk Touch Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Đã đặt lịch trước */}
              <button
                type="button"
                onClick={() => {
                  setMode("APPOINTMENT");
                  speakVoice("Quý khách vui lòng nhập mã vé hẹn hoặc quét mã Q R trên điện thoại.");
                }}
                className="group relative flex flex-col items-center justify-between p-8 rounded-[14px] bg-[#e1f4df] text-center transition-colors min-h-[360px]"
              >
                <div className="w-20 h-20 rounded-[14px] bg-[#fffefc] flex items-center justify-center text-[#0f3e17] mb-4 group-hover:scale-105 transition-transform">
                  <CalendarCheck className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <span className="eyebrow block text-[#0f3e17]/80">
                    Bước 1
                  </span>
                  <h3 className="font-display-serif-medium text-3xl tracking-tight text-[#0c2f10]">
                    ĐÃ ĐẶT LỊCH TRƯỚC
                  </h3>
                  <p className="text-xs text-[#222222]/80 leading-relaxed">
                    Đã đăng ký qua Website hoặc có Mã vé hẹn. Quét QR hoặc bấm SĐT.
                  </p>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#0f3e17]">
                  <span>Chạm để Check-in ngay</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              {/* Card 2: Ưu tiên Y tế PHCN */}
              <button
                type="button"
                onClick={() => {
                  setMode("PRIORITY");
                  speakVoice("Mời Quý khách chọn đối tượng ưu tiên để lấy số tiếp đón nhanh.");
                }}
                className="group relative flex flex-col items-center justify-between p-8 rounded-[14px] bg-[#b1dbb8] text-center transition-colors min-h-[360px]"
              >
                <div className="w-20 h-20 rounded-[14px] bg-[#fffefc] flex items-center justify-center text-[#0f3e17] mb-4 group-hover:scale-105 transition-transform">
                  <Accessibility className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <span className="eyebrow block text-[#0f3e17]/80">
                    Lối Đi Riêng
                  </span>
                  <h3 className="font-display-serif-medium text-3xl tracking-tight text-[#0c2f10]">
                    LẤY SỐ ƯU TIÊN
                  </h3>
                  <p className="text-xs text-[#222222]/80 leading-relaxed">
                    Dành cho <strong>Người cao tuổi</strong>, <strong>Bệnh nhân liệt/khuyết tật</strong>, hoặc <strong>Phụ nữ có thai</strong>.
                  </p>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#0f3e17]">
                  <span>Chạm để lấy số ưu tiên</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              {/* Card 3: Khám Thường */}
              <button
                type="button"
                onClick={() => {
                  setMode("REGULAR");
                  speakVoice("Mời Quý khách chọn dịch vụ khám phục hồi chức năng.");
                }}
                className="group relative flex flex-col items-center justify-between p-8 rounded-[14px] bg-[#b6ced5] text-center transition-colors min-h-[360px]"
              >
                <div className="w-20 h-20 rounded-[14px] bg-[#fffefc] flex items-center justify-center text-[#0f3e17] mb-4 group-hover:scale-105 transition-transform">
                  <UserCheck className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <span className="eyebrow block text-[#0f3e17]/80">
                    Lần Đầu Khám
                  </span>
                  <h3 className="font-display-serif-medium text-3xl tracking-tight text-[#0c2f10]">
                    KHÁM THƯỜNG
                  </h3>
                  <p className="text-xs text-[#222222]/80 leading-relaxed">
                    Bệnh nhân chưa đặt lịch hẹn trước, đến khám lượng giá ban đầu hoặc tập vật lý trị liệu trong ngày.
                  </p>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#0f3e17]">
                  <span>Chạm để lấy số thường</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ===================== MODE: APPOINTMENT ===================== */}
        {mode === "APPOINTMENT" && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetToHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#e1f4df]/40 text-xs font-semibold text-[#0f3e17] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại Trang chính</span>
              </button>
              <span className="eyebrow text-[#0f3e17]">
                Check-in Lịch Hẹn Trước
              </span>
            </div>

            <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-1">
                <h3 className="font-display-serif text-xl sm:text-2xl tracking-tight text-[#0f3e17]">
                  Nhập Mã Vé Hẹn hoặc Số Điện Thoại
                </h3>
                <p className="text-xs text-[#222222]/70">
                  Dùng bàn phím số bên dưới để nhập mã hẹn
                </p>
              </div>

              {/* Input Display */}
              <div className="p-4 rounded-[14px] bg-[#e1f4df] border border-[#efeeeb] text-center font-display-serif-medium text-4xl sm:text-5xl tracking-tight text-[#0f3e17] min-h-[72px] flex items-center justify-center">
                {appointmentCodeInput || <span className="text-[#222222]/40 text-xl font-sans font-normal">Chạm các phím bên dưới...</span>}
              </div>

              {/* On-Screen Touch Keypad */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "APT", "0", "BACK"].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadPress(key)}
                    className={`h-16 rounded-[14px] text-xl font-semibold flex items-center justify-center transition-colors ${
                      key === "APT"
                        ? "bg-[#e1f4df] border border-[#efeeeb] text-[#0f3e17] font-semibold"
                        : key === "BACK"
                        ? "bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold"
                        : "bg-[#fffefc] hover:bg-[#e1f4df]/40 border border-[#efeeeb] text-[#222222] text-2xl font-semibold"
                    }`}
                  >
                    {key === "BACK" ? "XÓA" : key}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex gap-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setAppointmentCodeInput("")}
                  className="flex-1 py-3.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#efeeeb]/40 text-[#222222] font-semibold text-xs"
                >
                  Xóa tất cả
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAppointment}
                  disabled={isSubmitting || !appointmentCodeInput}
                  className="flex-[2] py-3.5 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isSubmitting ? "Đang kiểm tra..." : "Xác nhận & Cấp số"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== MODE: PRIORITY ===================== */}
        {mode === "PRIORITY" && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetToHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#e1f4df]/40 text-xs font-semibold text-[#0f3e17] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại Trang chính</span>
              </button>
              <span className="eyebrow text-[#0f3e17]">
                Lấy Số Tiếp Đón Ưu Tiên
              </span>
            </div>

            <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-1">
                <h3 className="font-display-serif text-xl sm:text-2xl tracking-tight text-[#0f3e17]">
                  Chọn Đối Tượng Ưu Tiên Y Tế
                </h3>
                <p className="text-xs text-[#222222]/70">
                  Hệ thống tự động xếp số tiếp đón lên đầu hàng đợi phục vụ
                </p>
              </div>

              {/* 3 Priority Choices */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPriorityType("ELDERLY")}
                  className={`p-4 rounded-[14px] border text-center transition-colors ${
                    priorityType === "ELDERLY"
                      ? "bg-[#e1f4df] border-[#efeeeb] text-[#0f3e17] font-semibold"
                      : "bg-[#fffefc] border-[#efeeeb] text-[#222222] hover:bg-[#efeeeb]/40"
                  }`}
                >
                  <div className="font-semibold text-sm">Người cao tuổi</div>
                  <div className="text-[11px] text-[#222222]/60 mt-1">Từ 75 tuổi trở lên</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPriorityType("DISABLED")}
                  className={`p-4 rounded-[14px] border text-center transition-colors ${
                    priorityType === "DISABLED"
                      ? "bg-[#e1f4df] border-[#efeeeb] text-[#0f3e17] font-semibold"
                      : "bg-[#fffefc] border-[#efeeeb] text-[#222222] hover:bg-[#efeeeb]/40"
                  }`}
                >
                  <div className="font-semibold text-sm">Khuyết tật / Liệt</div>
                  <div className="text-[11px] text-[#222222]/60 mt-1">Đi xe lăn / Nạng</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPriorityType("PREGNANT")}
                  className={`p-4 rounded-[14px] border text-center transition-colors ${
                    priorityType === "PREGNANT"
                      ? "bg-[#e1f4df] border-[#efeeeb] text-[#0f3e17] font-semibold"
                      : "bg-[#fffefc] border-[#efeeeb] text-[#222222] hover:bg-[#efeeeb]/40"
                  }`}
                >
                  <div className="font-semibold text-sm">Phụ nữ mang thai</div>
                  <div className="text-[11px] text-[#222222]/60 mt-1">Đau khớp háng/lưng</div>
                </button>
              </div>

              {/* Quick Info Form */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                    Họ và tên người bệnh (hoặc người nhà đi cùng):
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Nhập họ tên"
                    className="w-full px-4 py-3 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-sm text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Năm sinh:
                    </label>
                    <input
                      type="number"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      className="w-full px-4 py-3 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-sm text-[#222222] font-semibold focus:outline-none focus:border-[#0f3e17]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Số điện thoại:
                    </label>
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="09xx.xxx.xxx"
                      className="w-full px-4 py-3 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-sm text-[#222222] font-semibold focus:outline-none focus:border-[#0f3e17]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                    Dị ứng thuốc / thức ăn:
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="Ví dụ: Penicillin — nổi mề đay 2023"
                    className="w-full px-4 py-3 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-sm text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmPriority}
                disabled={isSubmitting}
                className="w-full py-4 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isSubmitting ? "Đang xử lý cấp vé..." : "Bấm In Số Thứ Tự Ưu Tiên"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ===================== MODE: REGULAR ===================== */}
        {mode === "REGULAR" && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetToHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#e1f4df]/40 text-xs font-semibold text-[#0f3e17] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại Trang chính</span>
              </button>
              <span className="eyebrow text-[#0f3e17]">
                Lấy Số Khám Thường
              </span>
            </div>

            <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-1">
                <h3 className="font-display-serif text-xl sm:text-2xl tracking-tight text-[#0f3e17]">
                  Chọn Nhu Cầu Khám & Trị Liệu
                </h3>
                <p className="text-xs text-[#222222]/70">
                  Chạm chọn dịch vụ phù hợp để hệ thống phân vào buồng chuyên khoa
                </p>
              </div>

              {/* Service list buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "Khám Lượng giá Chức năng Ban đầu",
                  "Tập Phục hồi chức năng sau Tai biến 1:1",
                  "Vật lý trị liệu Điện xung & Sóng ngắn",
                  "Kéo giãn Cột sống Thắt lưng & Cổ",
                ].map((srv) => (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => setSelectedService(srv)}
                    className={`p-4 rounded-[14px] border text-left transition-colors ${
                      selectedService === srv
                        ? "bg-[#e1f4df] border-[#efeeeb] text-[#0f3e17] font-semibold"
                        : "bg-[#fffefc] border-[#efeeeb] text-[#222222] hover:bg-[#efeeeb]/40"
                    }`}
                  >
                    <div className="font-semibold text-xs sm:text-sm">{srv}</div>
                  </button>
                ))}
              </div>

              {/* Patient Name input */}
              <div>
                <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                  Họ và tên người bệnh:
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Nhập họ tên"
                  className="w-full px-4 py-3 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-sm text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmRegular}
                disabled={isSubmitting}
                className="w-full py-4 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isSubmitting ? "Đang cấp vé..." : "Bấm In Số Thứ Tự Khám"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ===================== MODE: SUCCESS ===================== */}
        {mode === "SUCCESS" && ticketResult && (
          <div className="max-w-md mx-auto w-full space-y-6 text-center">
            {/* Success Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e1f4df] text-[#0f3e17] text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-[#0f3e17]" />
              <span>LẤY SỐ THÀNH CÔNG • VUI LÒNG NHẬN PHIẾU BÊN DƯỚI</span>
            </div>

            {/* Ticket Card Mockup */}
            <div className="bg-[#fffefc] text-[#222222] rounded-[14px] p-8 space-y-5 text-left border border-[#efeeeb]">
              <div className="text-center border-b pb-3 border-[#efeeeb]">
                <div className="eyebrow text-[#0f3e17]">
                  PHÒNG KHÁM PHỤC HỒI CHỨC NĂNG BÁC SĨ THANH SANG
                </div>
                <div className="text-[10px] text-[#222222]/60 mt-0.5">
                  193 Quang Trung, Đại Lộc, Đà Nẵng • 0369.117.117
                </div>
                <h3 className="font-display-serif text-base tracking-tight text-[#0f3e17] uppercase mt-1">
                  PHIẾU TIẾP ĐÓN KHÁM BỆNH
                </h3>
              </div>

              <div className="text-center py-4 bg-[#e1f4df] rounded-[14px]">
                <div className="text-xs text-[#0f3e17] font-semibold">SỐ THỨ TỰ TIẾP ĐÓN</div>
                <div className="font-display-serif-medium text-6xl tracking-[-0.03em] text-[#0f3e17] my-1">
                  {ticketResult.queueNumber}
                </div>
                <div className="text-xs font-semibold text-[#0f3e17]/80">
                  {ticketResult.roomName}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#222222] border-b pb-3 border-[#efeeeb]">
                <div className="flex justify-between">
                  <span className="text-[#222222]/60">Họ và tên:</span>
                  <strong className="text-[#0f3e17] text-sm">{ticketResult.patientName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#222222]/60">Nhu cầu:</span>
                  <span className="font-semibold text-right max-w-[200px] text-[#222222]">{ticketResult.typeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#222222]/60">Thời gian:</span>
                  <span>{currentTime} - 12/11/2026</span>
                </div>
              </div>

              <div className="text-center text-[11px] text-[#222222]/60 italic">
                * Quý khách vui lòng ngồi tại sảnh và chú ý theo dõi màn hình TV gọi số.
              </div>
            </div>

            {/* Actions & Auto Countdown */}
            <div className="space-y-3">
              <div className="text-xs text-[#222222]/60">
                Tự động quay về màn hình chính sau <strong className="text-[#0f3e17] font-semibold text-sm">{countdown}</strong> giây...
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleResetToHome}
                  className="flex-1 py-3.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#efeeeb]/40 text-[#222222] font-semibold text-xs"
                >
                  Xong / Về Trang Đầu
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3.5 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>In lại phiếu K80</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="px-8 py-4 border-t border-[#efeeeb] bg-[#fffefc] flex items-center justify-between text-xs text-[#222222]/60 z-20">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[#0f3e17]" />
          <span>Kiosk tự động hỗ trợ phát thanh giọng nói tiếng Việt cho người cao tuổi</span>
        </div>

        <div className="flex items-center gap-4 font-medium">
          <Link href="/" className="hover:text-[#0f3e17] transition-colors">
            Cổng Web Bệnh nhân
          </Link>
          <span>•</span>
          <Link href="/dashboard" className="hover:text-[#0f3e17] transition-colors">
            Cổng Quản trị Nội bộ
          </Link>
          <span>•</span>
          <Link href="/tv-display" className="hover:text-[#0f3e17] transition-colors">
            Màn hình TV Sảnh chờ
          </Link>
        </div>
      </footer>
    </div>
  );
}
