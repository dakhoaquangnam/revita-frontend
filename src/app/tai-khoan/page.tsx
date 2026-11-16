"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { authService, UserProfile } from "@/services/auth.service";
import { appointmentService } from "@/services/appointment.service";
import { apiClient } from "@/lib/api";
import {
  therapyService,
  TherapySession,
  HomeExerciseLog,
  therapySessionVas,
  therapySessionDurationMin,
} from "@/services/therapy.service";
import { exerciseService, Exercise } from "@/services/exercise.service";
import {
  User,
  Phone,
  Lock,
  Calendar,
  FileText,
  Pill,
  CreditCard,
  QrCode,
  LogOut,
  CheckCircle2,
  Stethoscope,
  AlertCircle,
  PlusCircle,
  ShieldCheck,
  Search,
} from "lucide-react";

interface LocalBooking {
  code: string;
  service: string;
  specialty: string;
  date: string;
  time: string;
  patientName: string;
  phone: string;
  price: number;
  status: string;
  createdAt: string;
}

export default function TaiKhoanPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [activeTab, setActiveTab] = useState<"appointments" | "records" | "prescriptions" | "invoices" | "sessions">("appointments");

  // Login form state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBirthYear, setRegBirthYear] = useState("1985");
  const [regGender, setRegGender] = useState("Nam");
  const [regAddress, setRegAddress] = useState("");
  // Luồng đăng ký OTP thật: info -> otp -> done
  const [regStep, setRegStep] = useState<"info" | "otp">("info");
  const [regSessionId, setRegSessionId] = useState("");
  const [regOtp, setRegOtp] = useState("");

  // Dữ liệu thật từ backend (nạp sau khi đăng nhập)
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [myProfileId, setMyProfileId] = useState("");
  const [myProfileCode, setMyProfileCode] = useState("");
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [myPrescriptions, setMyPrescriptions] = useState<any[]>([]);
  // GĐ4 — đơn thuốc + đơn bài tập của bệnh nhân (xem ở tab Đơn thuốc).
  const [myMedicationPrescriptions, setMyMedicationPrescriptions] = useState<any[]>([]);
  const [myExercisePrescriptions, setMyExercisePrescriptions] = useState<any[]>([]);
  // GĐ5 — các buổi trị liệu của tôi + nhật ký tự tập ở nhà.
  const [mySessions, setMySessions] = useState<TherapySession[]>([]);
  const [myHomeLogs, setMyHomeLogs] = useState<HomeExerciseLog[]>([]);
  const [logExercisePrescriptionId, setLogExercisePrescriptionId] = useState("");
  const [logExtraSearch, setLogExtraSearch] = useState("");
  const [logExtraResults, setLogExtraResults] = useState<Exercise[]>([]);
  const [logExtraSearching, setLogExtraSearching] = useState(false);
  const [logExtraExerciseId, setLogExtraExerciseId] = useState("");
  const [logSetsDone, setLogSetsDone] = useState("");
  const [logRepsDone, setLogRepsDone] = useState("");
  const [logHoldSecDone, setLogHoldSecDone] = useState("");
  const [logPainDuring, setLogPainDuring] = useState("");
  const [logCompleted, setLogCompleted] = useState(true);
  const [logNote, setLogNote] = useState("");
  const [logSaving, setLogSaving] = useState(false);
  const [logMsg, setLogMsg] = useState("");
  const [logError, setLogError] = useState("");
  const [myInvoices, setMyInvoices] = useState<any[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  // Local bookings history
  const [localBookings, setLocalBookings] = useState<LocalBooking[]>([]);
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<LocalBooking | null>(null);

  // Search booking by code
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<LocalBooking | null>(null);

  // Load existing session and bookings from localStorage
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user && authService.isAuthenticated()) {
      setIsLoggedIn(true);
      setCurrentUser(user);
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("revita_bookings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setLocalBookings(parsed);
        } catch {}
      }
    }
  }, []);

  // Nạp dữ liệu thật của bệnh nhân sau khi đăng nhập.
  const loadPortalData = async () => {
    setPortalLoading(true);
    setPortalError("");
    try {
      const appointments = await appointmentService.getMyAppointments();
      setMyAppointments(appointments);
      const first = appointments[0];
      const profileId =
        first?.patientProfile?.id ?? first?.patientProfileId ?? "";
      const profileCode =
        first?.patientProfileCode ?? first?.patientProfile?.profileCode ?? "";
      if (profileId) {
        setMyProfileId(profileId);
        setMyProfileCode(profileCode);
        const [recordsRes, rxRes, invRes, medRes, exRes, sessRes, logsRes] = await Promise.allSettled([
          apiClient.get(`/medical-records/patient-profile/${profileId}`),
          apiClient.get(`/prescriptions/my/profile/${profileId}`),
          apiClient.get(`/invoice-payments/history/${profileId}`),
          // GĐ4 — đơn thuốc + đơn bài tập đang hiệu lực của bệnh nhân.
          apiClient.get(`/medication-prescriptions/mine/profiles/${profileId}`),
          apiClient.get(`/exercise-prescriptions/patient/${profileId}?status=ACTIVE&limit=20`),
          // GĐ5 — các buổi trị liệu + nhật ký tự tập của chính mình.
          therapyService.getPatientSessions(profileId),
          therapyService.getMyHomeLogs({ patientProfileId: profileId }),
        ]);
        const unwrap = (r: any): any[] => {
          const d = r.status === "fulfilled" ? r.value?.data : null;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d?.records)) return d.records;
          if (Array.isArray(d?.data)) return d.data;
          if (Array.isArray(d?.items)) return d.items;
          if (Array.isArray(d?.results)) return d.results;
          return [];
        };
        setMyRecords(unwrap(recordsRes));
        setMyPrescriptions(unwrap(rxRes));
        setMyInvoices(unwrap(invRes));
        setMyMedicationPrescriptions(unwrap(medRes));
        setMyExercisePrescriptions(unwrap(exRes));
        setMySessions(sessRes.status === "fulfilled" ? sessRes.value : []);
        setMyHomeLogs(logsRes.status === "fulfilled" ? logsRes.value : []);
      }
    } catch (err: any) {
      setPortalError(
        err.response?.data?.message ||
          "Không tải được dữ liệu hồ sơ. Vui lòng thử lại.",
      );
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) loadPortalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Handle Login — đăng nhập thật; sai thì báo lỗi, không tự bịa tài khoản.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await authService.login({
        identifier: loginPhone.trim(),
        password: loginPassword,
      });
      setIsLoggedIn(true);
      setCurrentUser(res.user);
    } catch (err: any) {
      setAuthError(
        err.response?.data?.message ||
          "Số điện thoại/email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Register — đúng luồng OTP của backend: step1 -> verify-otp -> complete.
  const handleRegisterStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await authService.registerStep1({ phone: regPhone.trim() });
      setRegSessionId(res.sessionId);
      setRegStep("otp");
    } catch (err: any) {
      setAuthError(
        err.response?.data?.message ||
          "Không gửi được mã OTP. Vui lòng kiểm tra số điện thoại và thử lại.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      await authService.verifyOtp({ otp: regOtp.trim(), sessionId: regSessionId });
      const genderMap: Record<string, "male" | "female" | "other"> = {
        Nam: "male",
        Nữ: "female",
      };
      await authService.completeRegistration({
        sessionId: regSessionId,
        name: regName.trim(),
        dateOfBirth: `${regBirthYear}-01-01`,
        gender: genderMap[regGender] ?? "other",
        address: regAddress.trim() || "Chưa cập nhật",
        password: regPassword,
      });
      // Tạo tài khoản xong thì đăng nhập luôn bằng thông tin vừa đăng ký.
      const res = await authService.login({
        identifier: regPhone.trim(),
        password: regPassword,
      });
      setIsLoggedIn(true);
      setCurrentUser(res.user);
    } catch (err: any) {
      setAuthError(
        err.response?.data?.message ||
          "Mã OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  // GĐ5 Q7 — ghi nhật ký tự tập hôm nay: chọn bài từ đơn ACTIVE của mình
  // hoặc bài ngoài đơn (tìm theo tên), nhập hiệp/lần thực tế + đau khi tập.
  const handleSearchLogExtra = async () => {
    const q = logExtraSearch.trim();
    if (q.length < 2) return;
    setLogExtraSearching(true);
    try {
      const res = await exerciseService.listExercises({ search: q, limit: 10 });
      setLogExtraResults(res.data);
    } catch {
      setLogExtraResults([]);
    } finally {
      setLogExtraSearching(false);
    }
  };

  const handleSubmitHomeLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogMsg("");
    setLogError("");
    if (!myProfileId) {
      setLogError("Chưa xác định được hồ sơ của bạn.");
      return;
    }
    const selectedRx = myExercisePrescriptions.find(
      (ep: any) => ep.id === logExercisePrescriptionId,
    );
    const exerciseId = selectedRx?.exerciseId ?? logExtraExerciseId;
    if (!exerciseId) {
      setLogError("Chọn một bài tập từ đơn của bạn hoặc tìm bài ngoài đơn.");
      return;
    }
    const pain =
      logPainDuring.trim() === "" ? undefined : Number(logPainDuring);
    if (pain !== undefined && (Number.isNaN(pain) || pain < 0 || pain > 10)) {
      setLogError("Đau khi tập phải từ 0 đến 10 (hoặc để trống).");
      return;
    }
    setLogSaving(true);
    try {
      const created = await therapyService.createHomeLog({
        patientProfileId: myProfileId,
        exercisePrescriptionId: selectedRx?.id,
        exerciseId,
        setsDone: logSetsDone.trim() === "" ? undefined : Number(logSetsDone),
        repsDone: logRepsDone.trim() === "" ? undefined : Number(logRepsDone),
        holdSecDone: logHoldSecDone.trim() === "" ? undefined : Number(logHoldSecDone),
        painDuring: pain,
        completed: logCompleted,
        note: logNote.trim() || undefined,
      });
      setMyHomeLogs((prev) => [created, ...prev]);
      setLogMsg(`Đã ghi nhật ký tự tập ${created.code ?? ""} — đang chờ KTV duyệt.`);
      setLogSetsDone("");
      setLogRepsDone("");
      setLogHoldSecDone("");
      setLogPainDuring("");
      setLogNote("");
    } catch (err: any) {
      setLogError(
        err.response?.data?.message ||
          "Không ghi được nhật ký tự tập. Vui lòng thử lại.",
      );
    } finally {
      setLogSaving(false);
    }
  };

  // Quick lookup ticket — tra cứu thật theo mã hẹn trên backend trước,
  // chỉ dùng biên lai đã lưu trên máy làm nguồn phụ.
  const handleSearchCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchCode.trim();
    if (!q) return;
    try {
      const apt = await appointmentService.getAppointmentByCode(q);
      const service = apt.services?.[0];
      setSearchResult({
        code: apt.appointmentCode,
        service: service?.serviceName ?? "Khám PHCN",
        specialty: apt.specialtyName ?? "",
        date: apt.date?.substring(0, 10) ?? "",
        time: `${apt.startTime ?? ""} - ${apt.endTime ?? ""}`,
        patientName: apt.patientProfile?.name ?? "",
        phone: apt.patientProfile?.phone ?? "",
        price: service?.price ?? 0,
        status: apt.status ?? "",
        createdAt: apt.createdAt ?? "",
      });
      return;
    } catch {
      // Không tìm thấy trên backend thì thử biên lai đã lưu trên máy.
    }
    const found = localBookings.find(
      (b) =>
        b.code.toLowerCase() === q.toLowerCase() || b.phone === q,
    );
    if (found) {
      setSearchResult(found);
    } else {
      setSearchResult(null);
      alert("Không tìm thấy phiếu hẹn nào khớp với mã hoặc số điện thoại này!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fffefc] text-[#222222]">
      <Navbar />

      <main className="flex-1 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Top Banner */}
          <div className="mb-10">
            <span className="eyebrow block text-[#0f3e17]">
              CỔNG BỆNH NHÂN ĐIỆN TỬ • BÁC SĨ THANH SANG
            </span>
            <h1 className="font-display-serif text-3xl sm:text-4xl tracking-tight text-[#0f3e17] mt-3">
              Hồ sơ Y tế & Lịch hẹn Khám bệnh
            </h1>
            <p className="text-sm text-[#222222]/80 mt-2">
              Tra cứu mã vé hẹn, xem kết quả lượng giá chức năng và cẩm nang bài tập điều trị cá nhân hóa.
            </p>
          </div>

          {/* VIEW 1: CHƯA ĐĂNG NHẬP */}
          {!isLoggedIn ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Login / Register Box */}
              <div className="lg:col-span-7 bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb]">
                {/* Tabs Switcher */}
                <div className="flex border-b border-[#efeeeb] mb-6">
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 -mb-[1px] ${
                      authMode === "login"
                        ? "border-[#0f3e17] text-[#0f3e17]"
                        : "border-transparent text-[#222222]/60 hover:text-[#0f3e17]"
                    }`}
                  >
                    Đăng nhập tài khoản
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("register")}
                    className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 -mb-[1px] ${
                      authMode === "register"
                        ? "border-[#0f3e17] text-[#0f3e17]"
                        : "border-transparent text-[#222222]/60 hover:text-[#0f3e17]"
                    }`}
                  >
                    Đăng ký bệnh nhân mới
                  </button>
                </div>

                {authError && (
                  <div className="mb-4 p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* LOGIN FORM */}
                {authMode === "login" && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Số điện thoại / Email đăng ký *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#222222]/40 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                          placeholder="0912 345 678"
                          className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Mật khẩu *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#222222]/40 absolute left-3.5 top-3.5" />
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm py-3.5 rounded-[14px] transition-colors disabled:opacity-50 mt-2"
                    >
                      {authLoading ? "Đang xác thực..." : "Đăng nhập Cổng Bệnh nhân"}
                    </button>
                  </form>
                )}

                {/* REGISTER FORM — luồng OTP thật của backend */}
                {authMode === "register" && regStep === "info" && (
                  <form onSubmit={handleRegisterStep1} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Họ và tên người bệnh *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#222222]/40 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Số điện thoại * (nhận mã OTP)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#222222]/40 absolute left-3.5 top-3.5" />
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="0912 345 678"
                          className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#0f3e17] mb-1">Năm sinh</label>
                        <input
                          type="number"
                          value={regBirthYear}
                          onChange={(e) => setRegBirthYear(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#0f3e17] mb-1">Giới tính</label>
                        <select
                          value={regGender}
                          onChange={(e) => setRegGender(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                        >
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Địa chỉ *
                      </label>
                      <input
                        type="text"
                        required
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        placeholder="Số nhà, đường, xã/phường..."
                        className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Tạo mật khẩu đăng nhập *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#222222]/40 absolute left-3.5 top-3.5" />
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Tối thiểu 6 ký tự"
                          className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm py-3.5 rounded-[14px] transition-colors disabled:opacity-50 mt-2"
                    >
                      {authLoading ? "Đang gửi mã OTP..." : "Gửi mã OTP xác thực"}
                    </button>
                  </form>
                )}

                {authMode === "register" && regStep === "otp" && (
                  <form onSubmit={handleRegisterVerify} className="space-y-4">
                    <p className="text-xs text-[#222222]/80 leading-relaxed">
                      Mã OTP 6 chữ số đã được gửi đến số <strong>{regPhone}</strong>.
                      Nhập mã để hoàn tất đăng ký tài khoản.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Mã OTP *
                      </label>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={6}
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-full px-3.5 py-2.5 text-sm tracking-[0.5em] text-center font-semibold bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm py-3.5 rounded-[14px] transition-colors disabled:opacity-50 mt-2"
                    >
                      {authLoading ? "Đang xác thực..." : "Xác thực & Tạo tài khoản"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegStep("info")}
                      className="w-full text-center text-xs text-[#222222]/60 hover:text-[#0f3e17] font-semibold py-1"
                    >
                      ← Quay lại sửa thông tin
                    </button>
                  </form>
                )}
              </div>

              {/* Right Column: Quick Lookup Ticket Without Login */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-[#0f3e17] text-[#fffefc] rounded-[14px] p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[14px] bg-[#fffefc]/15 text-[#b1dbb8] flex items-center justify-center">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display-serif text-base tracking-tight text-[#fffefc]">Tra cứu vé hẹn nhanh</h3>
                      <p className="text-xs text-[#cfe7d3]">Không cần đăng nhập tài khoản</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#cfe7d3] leading-relaxed">
                    Bạn vừa đặt lịch hẹn tại trang web? Nhập mã phiếu hẹn (ví dụ: <code>APT-...</code>) hoặc số điện thoại để lấy mã QR vào phòng khám.
                  </p>

                  <form onSubmit={handleSearchCode} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      placeholder="Nhập mã vé APT-... hoặc SĐT"
                      className="w-full px-4 py-2.5 text-sm bg-[#fffefc]/10 border border-[#fffefc]/20 rounded-[14px] text-[#fffefc] placeholder-[#cfe7d3]/60 focus:outline-none focus:border-[#b1dbb8]"
                    />
                    <button
                      type="submit"
                      className="w-full bg-[#e1f4df] hover:bg-[#cfe7d3] text-[#0f3e17] font-semibold text-xs py-2.5 rounded-[14px] transition-colors"
                    >
                      Tra cứu vé hẹn
                    </button>
                  </form>

                  {/* Search Result Display */}
                  {searchResult && (
                    <div className="p-4 bg-[#fffefc]/10 rounded-[14px] border border-[#fffefc]/20 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[#b1dbb8] font-semibold pb-2 border-b border-[#fffefc]/10">
                        <span className="font-semibold">Mã vé: {searchResult.code}</span>
                        <span className="text-[#e1f4df] font-semibold text-xs inline-flex items-center gap-1">
                          {searchResult.status}
                        </span>
                      </div>
                      <p><strong>Người khám:</strong> {searchResult.patientName}</p>
                      <p><strong>Ngày khám:</strong> {searchResult.date} ({searchResult.time})</p>
                      <p><strong>Dịch vụ:</strong> {searchResult.service}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedTicketForQr(searchResult)}
                        className="inline-flex items-center gap-1.5 text-[#b1dbb8] font-semibold hover:underline pt-1 text-xs"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Xem mã QR quét tại Kiosk</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Helpful Clinic Information */}
                <div className="bg-[#fffefc] rounded-[14px] p-6 border border-[#efeeeb] text-xs text-[#222222]/80 space-y-2.5">
                  <h4 className="font-semibold text-[#0f3e17] text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0f3e17]" />
                    <span>Lợi ích khi đăng nhập Cổng Bệnh nhân</span>
                  </h4>
                  <p>✓ Lưu lại toàn bộ lịch sử đo góc gập duỗi khớp (ROM) qua các đợt khám.</p>
                  <p>✓ Nhận video bài tập trị liệu tại nhà được bác sĩ kê riêng cho từng bệnh nhân.</p>
                  <p>✓ Nhận thông báo nhắc lịch tập vật lý trị liệu định kỳ.</p>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW 2: ĐÃ ĐĂNG NHẬP */
            <div className="space-y-8">
              {/* Patient Identity Profile Card */}
              <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[14px] bg-[#e1f4df] text-[#0f3e17] flex items-center justify-center font-display-serif-medium text-3xl">
                    {currentUser?.name?.charAt(0) || "P"}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-display-serif text-xl tracking-tight text-[#0f3e17]">{currentUser?.name}</h2>
                      <span className="text-xs font-semibold text-[#0f3e17]/75">
                        Hồ sơ điện tử: {myProfileCode || "—"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#222222]/70">
                      <span>SĐT: <strong className="text-[#0f3e17]">{currentUser?.phone}</strong></span>
                      <span>Giới tính: <strong className="text-[#0f3e17]">{currentUser?.gender || "Nam"}</strong></span>
                      <span>Năm sinh: <strong className="text-[#0f3e17]">{currentUser?.dateOfBirth?.substring(0, 4) || "1982"}</strong></span>
                      <span>Địa chỉ: <strong className="text-[#0f3e17]">{currentUser?.address || "TP.HCM"}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/dat-lich"
                    className="inline-flex items-center gap-1.5 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-xs px-4 py-2.5 rounded-[14px] transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Đặt lịch khám mới</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 bg-[#fffefc] border border-[#efeeeb] hover:bg-[#efeeeb]/40 text-[#222222] font-semibold text-xs px-3.5 py-2.5 rounded-[14px] transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>

              {/* Dashboard Navigation Tabs */}
              <div className="flex gap-2 border-b border-[#efeeeb] pb-3 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab("appointments")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[14px] text-xs font-semibold transition-colors ${
                    activeTab === "appointments"
                      ? "bg-[#0f3e17] text-[#fffefc]"
                      : "bg-[#fffefc] text-[#222222]/70 hover:bg-[#efeeeb]/40 border border-[#efeeeb]"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Lịch hẹn khám ({myAppointments.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("records")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[14px] text-xs font-semibold transition-colors ${
                    activeTab === "records"
                      ? "bg-[#0f3e17] text-[#fffefc]"
                      : "bg-[#fffefc] text-[#222222]/70 hover:bg-[#efeeeb]/40 border border-[#efeeeb]"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Bệnh án & Lượng giá FIM/Barthel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("prescriptions")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[14px] text-xs font-semibold transition-colors ${
                    activeTab === "prescriptions"
                      ? "bg-[#0f3e17] text-[#fffefc]"
                      : "bg-[#fffefc] text-[#222222]/70 hover:bg-[#efeeeb]/40 border border-[#efeeeb]"
                  }`}
                >
                  <Pill className="w-4 h-4" />
                  <span>Đơn thuốc & Bài tập chỉ định</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("invoices")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[14px] text-xs font-semibold transition-colors ${
                    activeTab === "invoices"
                      ? "bg-[#0f3e17] text-[#fffefc]"
                      : "bg-[#fffefc] text-[#222222]/70 hover:bg-[#efeeeb]/40 border border-[#efeeeb]"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Lịch sử Hóa đơn & VietQR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("sessions")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[14px] text-xs font-semibold transition-colors ${
                    activeTab === "sessions"
                      ? "bg-[#0f3e17] text-[#fffefc]"
                      : "bg-[#fffefc] text-[#222222]/70 hover:bg-[#efeeeb]/40 border border-[#efeeeb]"
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Buổi trị liệu & Tự tập</span>
                </button>
              </div>

              {/* TAB 1: APPOINTMENTS — lịch hẹn thật từ backend */}
              {activeTab === "appointments" && (
                <div className="space-y-4">
                  {portalLoading ? (
                    <div className="bg-[#fffefc] rounded-[14px] p-12 text-center border border-[#efeeeb] text-sm text-[#222222]/70">
                      Đang tải lịch hẹn...
                    </div>
                  ) : portalError ? (
                    <div className="bg-[#fffefc] rounded-[14px] p-6 text-center border border-rose-200 text-rose-700 text-sm">
                      {portalError}
                    </div>
                  ) : myAppointments.length === 0 ? (
                    <div className="bg-[#fffefc] rounded-[14px] p-12 text-center border border-[#efeeeb] space-y-4">
                      <div className="w-16 h-16 rounded-[14px] bg-[#e1f4df] text-[#0f3e17] flex items-center justify-center mx-auto">
                        <Calendar className="w-8 h-8" />
                      </div>
                      <h3 className="font-display-serif text-base tracking-tight text-[#0f3e17]">Chưa có lịch hẹn nào</h3>
                      <p className="text-xs text-[#222222]/70 max-w-sm mx-auto">
                        Bạn chưa đăng ký lịch khám phục hồi chức năng nào. Hãy đặt lịch ngay để được bác sĩ chuyên khoa thăm khám.
                      </p>
                      <Link
                        href="/dat-lich"
                        className="inline-flex items-center gap-1.5 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold px-5 py-2.5 rounded-[14px] transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Đặt lịch khám ngay</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myAppointments.map((apt: any) => (
                        <div
                          key={apt.appointmentId ?? apt.appointmentCode}
                          className="bg-[#fffefc] rounded-[14px] p-5 border border-[#efeeeb] space-y-3 transition-colors"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-[#efeeeb]">
                            <span className="text-xs font-semibold text-[#0f3e17]">
                              Mã vé: {apt.appointmentCode}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f3e17]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0f3e17]" />
                              {apt.status}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-[#222222]/80">
                            <h4 className="font-semibold text-[#0f3e17] text-sm">
                              {apt.services?.[0]?.serviceName ?? "Khám PHCN"}
                            </h4>
                            <p><strong>Chuyên khoa:</strong> {apt.specialtyName}</p>
                            <p className="text-[#0f3e17] font-semibold">
                              <strong>Thời gian hẹn:</strong> {String(apt.date ?? "").substring(0, 10)} ({apt.startTime} - {apt.endTime})
                            </p>
                            <p><strong>Bác sĩ:</strong> {apt.doctorName}</p>
                          </div>

                          <div className="pt-2 border-t border-[#efeeeb] flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#0f3e17]">
                              {(apt.services?.[0]?.price ?? 0).toLocaleString("vi-VN")} đ
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTicketForQr({
                                  code: apt.appointmentCode,
                                  service: apt.services?.[0]?.serviceName ?? "Khám PHCN",
                                  specialty: apt.specialtyName ?? "",
                                  date: String(apt.date ?? "").substring(0, 10),
                                  time: `${apt.startTime} - ${apt.endTime}`,
                                  patientName: apt.patientProfile?.name ?? currentUser?.name ?? "",
                                  phone: apt.patientProfile?.phone ?? "",
                                  price: apt.services?.[0]?.price ?? 0,
                                  status: apt.status ?? "",
                                  createdAt: apt.createdAt ?? "",
                                })
                              }
                              className="inline-flex items-center gap-1.5 bg-[#e1f4df] hover:bg-[#cfe7d3] text-[#0f3e17] font-semibold text-xs px-3 py-1.5 rounded-[14px] transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Mã QR Check-in</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MEDICAL RECORDS — bệnh án thật từ backend */}
              {activeTab === "records" && (
                <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#efeeeb]">
                    <div>
                      <h3 className="font-display-serif text-base tracking-tight text-[#0f3e17]">Hồ sơ Lượng giá Chức năng Điện tử</h3>
                      <p className="text-xs text-[#222222]/70">Bệnh án do bác sĩ phòng khám lập sau mỗi lần khám</p>
                    </div>
                  </div>

                  {portalLoading ? (
                    <p className="text-sm text-[#222222]/70 text-center py-8">Đang tải bệnh án...</p>
                  ) : myRecords.length === 0 ? (
                    <p className="text-sm text-[#222222]/70 text-center py-8">
                      Chưa có bệnh án nào. Bệnh án sẽ hiện ở đây sau lần khám đầu tiên của bạn.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {myRecords.map((rec: any) => {
                        const content = rec.content ?? {};
                        const fimTotal =
                          content.fimTotal ??
                          (content.fim
                            ? Object.values(content.fim).reduce(
                                (s: number, v: any) => s + (Number(v) || 0),
                                0,
                              )
                            : null);
                        const romList: any[] = Array.isArray(content.romList)
                          ? content.romList
                          : Array.isArray(content.rom)
                            ? content.rom
                            : [];
                        return (
                          <div key={rec.id ?? rec.medicalRecordCode} className="p-4 rounded-[14px] border border-[#efeeeb] space-y-3">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <span className="font-semibold text-[#0f3e17] text-sm">
                                Bệnh án {rec.medicalRecordCode ?? ""}
                              </span>
                              <span className="text-xs text-[#222222]/60">
                                {String(rec.createdAt ?? "").substring(0, 10)} • {rec.status ?? ""}
                              </span>
                            </div>
                            {content.diagnosis && (
                              <p className="text-xs text-[#222222]/80 leading-relaxed">
                                <strong>Chẩn đoán:</strong> {content.diagnosis}
                              </p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              <div className="p-3 bg-[#e1f4df] rounded-[14px]">
                                <span className="text-[#222222]/70">Thang điểm FIM</span>
                                <p className="font-display-serif-medium text-2xl tracking-tight text-[#0f3e17]">
                                  {fimTotal != null ? `${fimTotal} / 126` : "—"}
                                </p>
                              </div>
                              <div className="p-3 bg-[#b6ced5] rounded-[14px]">
                                <span className="text-[#222222]/70">Mức đau (VAS)</span>
                                <p className="font-display-serif-medium text-2xl tracking-tight text-[#0f3e17]">
                                  {content.painScale != null ? `${content.painScale} / 10` : "—"}
                                </p>
                              </div>
                              <div className="p-3 bg-[#b1dbb8] rounded-[14px]">
                                <span className="text-[#222222]/70">Số đo ROM</span>
                                <p className="font-display-serif-medium text-2xl tracking-tight text-[#0f3e17]">
                                  {romList.length > 0 ? `${romList.length} khớp` : "—"}
                                </p>
                              </div>
                            </div>
                            {romList.length > 0 && (
                              <div className="text-xs text-[#222222]/80 space-y-1">
                                {romList.map((r: any, i: number) => (
                                  <p key={i}>
                                    • {r.joint ?? ""} — {r.movement ?? ""}: trái {r.leftAngle ?? "?"}° / phải{" "}
                                    {r.rightAngle ?? "?"}° (chuẩn {r.normalRange ?? ""})
                                  </p>
                                ))}
                              </div>
                            )}
                            {content.doctorNotes && (
                              <p className="text-xs text-[#222222]/80 leading-relaxed">
                                <strong>Ghi chú bác sĩ:</strong> {content.doctorNotes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PRESCRIPTIONS — phiếu chỉ định thật từ backend */}
              {activeTab === "prescriptions" && (
                <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#efeeeb]">
                    <div>
                      <h3 className="font-display-serif text-base tracking-tight text-[#0f3e17]">Phiếu chỉ định dịch vụ trị liệu</h3>
                      <p className="text-xs text-[#222222]/70">Các dịch vụ bác sĩ đã chỉ định cho bạn</p>
                    </div>
                  </div>

                  {portalLoading ? (
                    <p className="text-sm text-[#222222]/70 text-center py-8">Đang tải phiếu chỉ định...</p>
                  ) : myPrescriptions.length === 0 ? (
                    <p className="text-sm text-[#222222]/70 text-center py-8">
                      Chưa có phiếu chỉ định nào. Phiếu chỉ định sẽ hiện ở đây sau khi bác sĩ khám và kê dịch vụ.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {myPrescriptions.map((rx: any) => (
                        <div key={rx.id ?? rx.prescriptionCode} className="p-4 rounded-[14px] border border-[#efeeeb] space-y-2">
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <span className="font-semibold text-[#0f3e17] text-sm">
                              Phiếu {rx.prescriptionCode ?? ""}
                            </span>
                            <span className="text-xs text-[#222222]/60">
                              {String(rx.createdAt ?? "").substring(0, 10)} • {rx.status ?? ""}
                            </span>
                          </div>
                          {(rx.services ?? []).map((s: any, i: number) => (
                            <div key={s.id ?? i} className="flex justify-between text-xs text-[#222222]/80 py-1 border-b border-[#efeeeb]/60">
                              <span>{s.service?.name ?? s.serviceName ?? s.name ?? ""}</span>
                              <span className="font-semibold text-[#0f3e17]">
                                {(s.service?.price ?? s.price ?? 0).toLocaleString("vi-VN")} đ • {s.status ?? ""}
                              </span>
                            </div>
                          ))}
                          {rx.note && (
                            <p className="text-xs text-[#222222]/70">
                              <strong>Ghi chú:</strong> {rx.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* GĐ4 — Đơn thuốc của tôi */}
                  <div className="pt-4 border-t border-[#efeeeb]">
                    <h4 className="font-semibold text-[#0f3e17] text-sm">Đơn thuốc của tôi</h4>
                    <p className="text-xs text-[#222222]/70 mb-3">
                      Đơn thuốc bác sĩ đã kê — mang mã đơn ra quầy để nhận thuốc (thu tiền tại quầy).
                    </p>
                    {myMedicationPrescriptions.length === 0 ? (
                      <p className="text-xs text-[#222222]/70">Chưa có đơn thuốc nào.</p>
                    ) : (
                      <div className="space-y-3">
                        {myMedicationPrescriptions.map((mp: any) => (
                          <div key={mp.id ?? mp.code} className="p-4 rounded-[14px] border border-[#efeeeb] space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <span className="font-semibold text-[#0f3e17] text-sm">
                                Đơn thuốc <span className="font-semibold">{mp.code ?? ""}</span>
                              </span>
                              <span className="text-xs text-[#222222]/60">
                                {String(mp.createdAt ?? "").substring(0, 10)} •{" "}
                                {mp.status === "DRAFT"
                                  ? "Bản nháp — chưa có giá trị phát thuốc"
                                  : mp.status === "SIGNED"
                                    ? "Đã ký"
                                    : mp.status === "DISPENSED"
                                      ? "Đã phát thuốc"
                                      : mp.status === "CANCELLED"
                                        ? "Đã hủy"
                                        : mp.status ?? ""}
                              </span>
                            </div>
                            {(mp.items ?? []).map((it: any, i: number) => (
                              <div key={it.id ?? i} className="text-xs text-[#222222]/80 py-1 border-b border-[#efeeeb]/60">
                                <strong className="text-[#0f3e17]">{it.name}</strong>
                                {it.strength ? ` ${it.strength}` : ""}
                                {it.dose != null ? ` — ${it.dose} ${it.doseUnit ?? ""}` : ""}
                                {it.frequency ? `, ${it.frequency}` : ""}
                                {it.durationDays ? ` trong ${it.durationDays} ngày` : ""}
                                {it.quantity != null ? ` • SL: ${it.quantity} ${it.quantityUnit ?? ""}` : ""}
                                {it.instructions ? (
                                  <span className="block text-[11px] text-[#222222]/60 mt-0.5">
                                    Cách dùng: {it.instructions}
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* GĐ4 — Bài tập của tôi (đang hiệu lực) */}
                  <div className="pt-4 border-t border-[#efeeeb]">
                    <h4 className="font-semibold text-[#0f3e17] text-sm">Bài tập của tôi</h4>
                    <p className="text-xs text-[#222222]/70 mb-3">
                      Các bài tập bác sĩ/KTV đã kê và đang tập — tập đúng liều đã ghi, dừng lại nếu đau tăng.
                    </p>
                    {myExercisePrescriptions.length === 0 ? (
                      <p className="text-xs text-[#222222]/70">Chưa có bài tập nào đang tập.</p>
                    ) : (
                      <div className="space-y-3">
                        {myExercisePrescriptions.map((ep: any) => (
                          <div key={ep.id ?? ep.code} className="p-4 rounded-[14px] bg-[#e1f4df]/30 space-y-1">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <span className="font-semibold text-[#0f3e17] text-sm">
                                {ep.exercise?.name ?? ep.exerciseName ?? "Bài tập"}
                              </span>
                              <span className="text-xs text-[#222222]/60 font-semibold">{ep.code ?? ""}</span>
                            </div>
                            <p className="text-xs text-[#222222]/80">
                              Liều tập:{" "}
                              <strong>
                                {[ep.sets ? `${ep.sets} hiệp` : "", ep.reps ? `${ep.reps} lần` : "", ep.holdSec ? `giữ ${ep.holdSec} giây` : "", ep.frequency ?? ""]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </strong>
                              {ep.durationDays ? ` • Trong ${ep.durationDays} ngày` : ""}
                            </p>
                            {ep.exercise?.instructions && (
                              <p className="text-xs text-[#222222]/70">{ep.exercise.instructions}</p>
                            )}
                            {ep.exercise?.precautions && (
                              <p className="text-xs text-amber-800">Lưu ý: {ep.exercise.precautions}</p>
                            )}
                            {ep.note && (
                              <p className="text-xs text-[#222222]/70">Ghi chú: {ep.note}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: INVOICES — hóa đơn thật từ backend */}
              {activeTab === "invoices" && (
                <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#efeeeb]">
                    <div>
                      <h3 className="font-display-serif text-base tracking-tight text-[#0f3e17]">Lịch sử Viện phí & Hóa đơn điện tử</h3>
                      <p className="text-xs text-[#222222]/70">Các hóa đơn đã phát hành cho bạn</p>
                    </div>
                  </div>

                  {portalLoading ? (
                    <p className="text-sm text-[#222222]/70 text-center py-8">Đang tải hóa đơn...</p>
                  ) : myInvoices.length === 0 ? (
                    <p className="text-sm text-[#222222]/70 text-center py-8">
                      Chưa có hóa đơn nào.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-[#efeeeb] rounded-[14px] overflow-hidden">
                        <thead className="bg-[#e1f4df]/40 text-[#0f3e17] font-semibold text-[11px]">
                          <tr>
                            <th className="p-3">Mã hóa đơn</th>
                            <th className="p-3">Ngày giao dịch</th>
                            <th className="p-3">Nội dung thanh toán</th>
                            <th className="p-3">Số tiền</th>
                            <th className="p-3">Phương thức</th>
                            <th className="p-3">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#efeeeb]">
                          {myInvoices.map((inv: any) => (
                            <tr key={inv.id ?? inv.invoiceCode}>
                              <td className="p-3 font-semibold text-[#0f3e17]">{inv.invoiceCode}</td>
                              <td className="p-3 text-[#222222]/70">{String(inv.createdAt ?? "").substring(0, 10)}</td>
                              <td className="p-3 font-semibold text-[#222222]">
                                {(inv.invoiceDetails ?? []).map((d: any) => d.service?.name ?? d.serviceName ?? "").join(", ") || "Viện phí"}
                              </td>
                              <td className="p-3 font-semibold text-[#0f3e17]">
                                {(inv.totalAmount ?? 0).toLocaleString("vi-VN")} đ
                              </td>
                              <td className="p-3 text-[#222222]/70">{inv.paymentMethod ?? ""}</td>
                              <td className="p-3">
                                <span className="bg-[#e1f4df] text-[#0f3e17] px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                  {inv.isPaid ? "Đã thanh toán" : inv.paymentStatus ?? ""}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {/* TAB 5 (GĐ5): BUỔI TRỊ LIỆU + NHẬT KÝ TỰ TẬP */}
              {activeTab === "sessions" && (
                <div className="space-y-6">
                  {/* Các buổi trị liệu của tôi */}
                  <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] space-y-4">
                    <div className="pb-3 border-b border-[#efeeeb]">
                      <h3 className="font-display-serif text-base tracking-tight text-[#0f3e17]">Các buổi trị liệu của tôi</h3>
                      <p className="text-xs text-[#222222]/70">
                        Mỗi buổi tập tại phòng khám: ngày, dịch vụ, bài đã tập, mức đau trước → sau buổi.
                      </p>
                    </div>
                    {portalLoading ? (
                      <p className="text-sm text-[#222222]/70 text-center py-8">Đang tải các buổi trị liệu...</p>
                    ) : mySessions.length === 0 ? (
                      <p className="text-sm text-[#222222]/70 text-center py-8">
                        Chưa có buổi trị liệu nào được ghi. Buổi tập sẽ hiện ở đây sau mỗi lần bạn tập tại phòng khám.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {mySessions.map((s) => (
                          <div key={s.id} className="p-4 rounded-[14px] border border-[#efeeeb] space-y-1 text-xs">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <span className="font-semibold text-[#0f3e17] text-sm">
                                Buổi <span className="font-semibold">{s.code}</span>
                              </span>
                              <span className="text-[#222222]/60">
                                {String(s.startedAt ?? "").substring(0, 10)}
                                {s.performedByName ? ` • ${s.performedByName}` : ""}
                                {therapySessionDurationMin(s) != null ? ` • ${therapySessionDurationMin(s)} phút` : ""}
                                {` • ${s.status === "COMPLETED" ? "Đã xong" : s.status === "CANCELLED" ? "Đã hủy" : "Đang làm"}`}
                              </span>
                            </div>
                            {s.services?.length ? (
                              <p className="text-[#222222]/80">
                                Dịch vụ: {s.services.map((x) => x.serviceName ?? "").filter(Boolean).join(", ")}
                              </p>
                            ) : null}
                            <p className="text-[#222222]/80">
                              Mức đau (VAS):{" "}
                              <strong>
                                {therapySessionVas(s.painBefore) != null ? `${therapySessionVas(s.painBefore)}/10` : "—"}
                                {" → "}
                                {therapySessionVas(s.painAfter) != null ? `${therapySessionVas(s.painAfter)}/10` : "—"}
                              </strong>
                              {` • ${s.exercises?.length ?? 0} bài đã tập`}
                            </p>
                            {(s.exercises ?? []).length > 0 && (
                              <ul className="text-[#222222]/70 space-y-0.5">
                                {s.exercises!.map((ex) => (
                                  <li key={ex.id}>
                                    • {ex.exerciseName ?? "Bài tập"}
                                    {ex.setsDone != null ? ` — ${ex.setsDone} hiệp` : ""}
                                    {ex.repsDone != null ? ` · ${ex.repsDone} lần` : ""}
                                    {ex.painDuring != null ? ` · đau ${ex.painDuring}/10` : ""}
                                    {ex.completed === false ? " · bỏ dở" : ""}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {s.notes && <p className="text-[#222222]/70">Ghi chú buổi: {s.notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ghi nhật ký tự tập hôm nay */}
                  <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] space-y-4">
                    <div className="pb-3 border-b border-[#efeeeb]">
                      <h3 className="font-display-serif text-base tracking-tight text-[#0f3e17]">Ghi nhật ký tự tập hôm nay</h3>
                      <p className="text-xs text-[#222222]/70">
                        Tập ở nhà xong thì ghi lại tại đây — KTV sẽ duyệt. Chỉ ghi ngày hôm nay trở về trước,
                        không ghi ngày tương lai.
                      </p>
                    </div>
                    {logMsg && (
                      <p className="p-3 rounded-[14px] bg-[#e1f4df] text-[#0f3e17] text-xs">{logMsg}</p>
                    )}
                    {logError && (
                      <p className="p-3 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-700 text-xs">{logError}</p>
                    )}
                    <form onSubmit={handleSubmitHomeLog} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                          Bài tập trong đơn của bạn *
                        </label>
                        <select
                          value={logExercisePrescriptionId}
                          onChange={(e) => {
                            setLogExercisePrescriptionId(e.target.value);
                            if (e.target.value) setLogExtraExerciseId("");
                          }}
                          className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                        >
                          <option value="">— Chọn bài trong đơn —</option>
                          {myExercisePrescriptions.map((ep: any) => (
                            <option key={ep.id} value={ep.id}>
                              {ep.exercise?.name ?? "Bài tập"}
                              {` (${[ep.sets ? `${ep.sets} hiệp` : "", ep.reps ? `${ep.reps} lần` : ""].filter(Boolean).join(" · ")})`}
                            </option>
                          ))}
                        </select>
                        {myExercisePrescriptions.length === 0 && (
                          <p className="text-[11px] text-[#222222]/60 mt-1">
                            Bạn chưa có bài tập nào đang tập — dùng ô tìm bài ngoài đơn bên dưới.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                          Hoặc bài ngoài đơn (tìm theo tên)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={logExtraSearch}
                            onChange={(e) => setLogExtraSearch(e.target.value)}
                            placeholder="Gõ ≥ 2 ký tự, VD: gập gối..."
                            className="flex-1 px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                          />
                          <button
                            type="button"
                            disabled={logExtraSearching || logExtraSearch.trim().length < 2}
                            onClick={handleSearchLogExtra}
                            className="px-4 py-2.5 rounded-[14px] border border-[#efeeeb] text-xs font-semibold hover:bg-[#efeeeb]/40 disabled:opacity-50"
                          >
                            {logExtraSearching ? "Đang tìm..." : "Tìm bài"}
                          </button>
                        </div>
                        {logExtraResults.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {logExtraResults.map((ex) => (
                              <li key={ex.id} className="flex items-center justify-between gap-2 text-xs">
                                <span>
                                  {ex.name} <span className="text-[#222222]/60">({ex.code})</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLogExtraExerciseId(ex.id);
                                    setLogExercisePrescriptionId("");
                                  }}
                                  className={`px-2 py-1 rounded-[14px] border text-[11px] font-semibold ${
                                    logExtraExerciseId === ex.id
                                      ? "bg-[#0f3e17] text-[#fffefc]"
                                      : "border-[#efeeeb] hover:bg-[#efeeeb]/40"
                                  }`}
                                >
                                  {logExtraExerciseId === ex.id ? "Đã chọn" : "Chọn bài này"}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#0f3e17] mb-1">Hiệp đã tập</label>
                          <input
                            type="number"
                            min={0}
                            value={logSetsDone}
                            onChange={(e) => setLogSetsDone(e.target.value)}
                            placeholder="VD: 3"
                            className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#0f3e17] mb-1">Lần/bài</label>
                          <input
                            type="number"
                            min={0}
                            value={logRepsDone}
                            onChange={(e) => setLogRepsDone(e.target.value)}
                            placeholder="VD: 10"
                            className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#0f3e17] mb-1">Giữ (giây)</label>
                          <input
                            type="number"
                            min={0}
                            value={logHoldSecDone}
                            onChange={(e) => setLogHoldSecDone(e.target.value)}
                            placeholder="VD: 5"
                            className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#0f3e17] mb-1">Đau khi tập (0–10)</label>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={logPainDuring}
                            onChange={(e) => setLogPainDuring(e.target.value)}
                            placeholder="Để trống nếu không đau"
                            className="w-full px-3.5 py-2.5 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-[#222222]">
                        <input
                          type="checkbox"
                          checked={!logCompleted}
                          onChange={(e) => setLogCompleted(!e.target.checked)}
                          className="w-4 h-4 accent-[#0f3e17]"
                        />
                        Tôi đã bỏ dở bài này (không tập hết)
                      </label>
                      <div>
                        <label className="block text-xs font-semibold text-[#0f3e17] mb-1">Ghi chú</label>
                        <textarea
                          rows={2}
                          value={logNote}
                          onChange={(e) => setLogNote(e.target.value)}
                          placeholder="VD: tập xong thấy nhẹ người, gối hơi mỏi..."
                          className="w-full p-3 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] text-xs text-[#222222] focus:outline-none focus:border-[#0f3e17]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={logSaving}
                        className="bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm py-3 px-6 rounded-[14px] transition-colors disabled:opacity-50"
                      >
                        {logSaving ? "Đang ghi..." : "Ghi nhật ký tự tập"}
                      </button>
                    </form>
                  </div>

                  {/* Nhật ký tự tập của tôi */}
                  <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] space-y-4">
                    <div className="pb-3 border-b border-[#efeeeb]">
                      <h3 className="font-display-serif text-base tracking-tight text-[#0f3e17]">Nhật ký tự tập của tôi</h3>
                      <p className="text-xs text-[#222222]/70">Các lần bạn đã ghi, kèm trạng thái duyệt của KTV.</p>
                    </div>
                    {myHomeLogs.length === 0 ? (
                      <p className="text-sm text-[#222222]/70 text-center py-8">Chưa có nhật ký tự tập nào.</p>
                    ) : (
                      <div className="space-y-3">
                        {myHomeLogs.map((log) => (
                          <div key={log.id} className="p-4 rounded-[14px] border border-[#efeeeb] space-y-1 text-xs">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <span className="font-semibold text-[#0f3e17] text-sm">
                                {log.exerciseName ?? "Bài tập"}
                                {log.code ? <span className="font-semibold text-[#222222]/60"> — {log.code}</span> : ""}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  log.status === "APPROVED"
                                    ? "bg-[#e1f4df] text-[#0f3e17]"
                                    : log.status === "REJECTED"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                              >
                                {log.status === "APPROVED" ? "Đã duyệt" : log.status === "REJECTED" ? "Từ chối" : "Chờ duyệt"}
                              </span>
                            </div>
                            <p className="text-[#222222]/80">
                              {String(log.loggedDate ?? log.createdAt ?? "").substring(0, 10)}
                              {log.setsDone != null ? ` • ${log.setsDone} hiệp` : ""}
                              {log.repsDone != null ? ` • ${log.repsDone} lần` : ""}
                              {log.holdSecDone != null ? ` • giữ ${log.holdSecDone} giây` : ""}
                              {log.painDuring != null ? ` • đau ${log.painDuring}/10` : ""}
                              {log.completed === false ? " • bỏ dở" : ""}
                            </p>
                            {log.note && <p className="text-[#222222]/70">Ghi chú của bạn: {log.note}</p>}
                            {log.reviewNote && (
                              <p className="text-[#0f3e17]">Ghi chú của KTV: {log.reviewNote}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* QR CODE MODAL FOR KIOSK CHECK-IN */}
          {selectedTicketForQr && (
            <div className="fixed inset-0 z-50 bg-[#0f3e17]/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 max-w-sm w-full border border-[#efeeeb] text-center space-y-4">
                <div className="w-12 h-12 rounded-[14px] bg-[#e1f4df] text-[#0f3e17] flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display-serif text-lg tracking-tight text-[#0f3e17]">Mã QR Check-in Tự Động</h3>
                  <p className="text-xs text-[#222222]/70">Đưa mã này vào mắt đọc camera tại Kiosk sảnh</p>
                </div>

                {/* QR Display */}
                <div className="p-4 bg-[#fffefc] rounded-[14px] border border-[#efeeeb] inline-block mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      selectedTicketForQr.code
                    )}`}
                    alt="Mã QR vé hẹn"
                    className="w-44 h-44 object-contain mx-auto"
                  />
                  <p className="font-display-serif text-xl tracking-tight text-[#0f3e17] mt-2">
                    {selectedTicketForQr.code}
                  </p>
                </div>

                <div className="text-xs text-[#222222]/80 bg-[#e1f4df]/30 p-3.5 rounded-[14px] text-left space-y-1">
                  <p><strong>Bệnh nhân:</strong> {selectedTicketForQr.patientName}</p>
                  <p><strong>Ngày giờ:</strong> {selectedTicketForQr.date} ({selectedTicketForQr.time})</p>
                  <p><strong>Dịch vụ:</strong> {selectedTicketForQr.service}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicketForQr(null)}
                  className="w-full bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-xs py-3 rounded-[14px] transition-colors"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
