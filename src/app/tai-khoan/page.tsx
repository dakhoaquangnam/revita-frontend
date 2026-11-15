"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { authService, UserProfile } from "@/services/auth.service";
import { appointmentService } from "@/services/appointment.service";
import { apiClient } from "@/lib/api";
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
  const [activeTab, setActiveTab] = useState<"appointments" | "records" | "prescriptions" | "invoices">("appointments");

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
        const [recordsRes, rxRes, invRes] = await Promise.allSettled([
          apiClient.get(`/medical-records/patient-profile/${profileId}`),
          apiClient.get(`/prescriptions/my/profile/${profileId}`),
          apiClient.get(`/invoice-payments/history/${profileId}`),
        ]);
        const unwrap = (r: any): any[] => {
          const d = r.status === "fulfilled" ? r.value?.data : null;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d?.records)) return d.records;
          if (Array.isArray(d?.data)) return d.data;
          if (Array.isArray(d?.items)) return d.items;
          return [];
        };
        setMyRecords(unwrap(recordsRes));
        setMyPrescriptions(unwrap(rxRes));
        setMyInvoices(unwrap(invRes));
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
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0f3e17]">
              CỔNG BỆNH NHÂN ĐIỆN TỬ • BÁC SĨ THANH SANG
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f3e17] tracking-tight mt-3">
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
                    className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 -mb-[1px] ${
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
                    className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 -mb-[1px] ${
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
                        className="w-full px-3.5 py-2.5 text-sm tracking-[0.5em] text-center font-mono bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17]"
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
                      <h3 className="font-bold text-base text-[#fffefc]">Tra cứu vé hẹn nhanh</h3>
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
                      <div className="flex justify-between items-center text-[#b1dbb8] font-bold pb-2 border-b border-[#fffefc]/10">
                        <span className="font-mono">Mã vé: {searchResult.code}</span>
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
                  <h4 className="font-bold text-[#0f3e17] text-sm flex items-center gap-1.5">
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
                  <div className="w-16 h-16 rounded-[14px] bg-[#e1f4df] border border-[#cfe7d3] text-[#0f3e17] flex items-center justify-center font-bold text-2xl">
                    {currentUser?.name?.charAt(0) || "P"}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-[#0f3e17]">{currentUser?.name}</h2>
                      <span className="text-xs font-mono font-medium text-[#0f3e17]/75">
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
                      <h3 className="text-base font-bold text-[#0f3e17]">Chưa có lịch hẹn nào</h3>
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
                            <span className="text-xs font-mono font-bold text-[#0f3e17]">
                              Mã vé: {apt.appointmentCode}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f3e17]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0f3e17]" />
                              {apt.status}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-[#222222]/80">
                            <h4 className="font-bold text-[#0f3e17] text-sm">
                              {apt.services?.[0]?.serviceName ?? "Khám PHCN"}
                            </h4>
                            <p><strong>Chuyên khoa:</strong> {apt.specialtyName}</p>
                            <p className="text-[#0f3e17] font-semibold">
                              <strong>Thời gian hẹn:</strong> {String(apt.date ?? "").substring(0, 10)} ({apt.startTime} - {apt.endTime})
                            </p>
                            <p><strong>Bác sĩ:</strong> {apt.doctorName}</p>
                          </div>

                          <div className="pt-2 border-t border-[#efeeeb] flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0f3e17]">
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
                              className="inline-flex items-center gap-1.5 bg-[#e1f4df] hover:bg-[#cfe7d3] text-[#0f3e17] font-semibold text-xs px-3 py-1.5 rounded-[14px] border border-[#cfe7d3] transition-colors"
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
                      <h3 className="font-bold text-[#0f3e17] text-base">Hồ sơ Lượng giá Chức năng Điện tử</h3>
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
                              <span className="font-bold text-[#0f3e17] text-sm">
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
                              <div className="p-3 bg-[#e1f4df]/40 rounded-[14px] border border-[#cfe7d3]">
                                <span className="text-[#222222]/70">Thang điểm FIM</span>
                                <p className="text-xl font-extrabold text-[#0f3e17]">
                                  {fimTotal != null ? `${fimTotal} / 126` : "—"}
                                </p>
                              </div>
                              <div className="p-3 bg-[#b6ced5]/30 rounded-[14px] border border-[#b6ced5]">
                                <span className="text-[#222222]/70">Mức đau (VAS)</span>
                                <p className="text-xl font-extrabold text-[#0f3e17]">
                                  {content.painScale != null ? `${content.painScale} / 10` : "—"}
                                </p>
                              </div>
                              <div className="p-3 bg-[#b1dbb8]/30 rounded-[14px] border border-[#b1dbb8]">
                                <span className="text-[#222222]/70">Số đo ROM</span>
                                <p className="text-xl font-extrabold text-[#0f3e17]">
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
                      <h3 className="font-bold text-[#0f3e17] text-base">Phiếu chỉ định dịch vụ trị liệu</h3>
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
                            <span className="font-bold text-[#0f3e17] text-sm">
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
                </div>
              )}

              {/* TAB 4: INVOICES — hóa đơn thật từ backend */}
              {activeTab === "invoices" && (
                <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#efeeeb]">
                    <div>
                      <h3 className="font-bold text-[#0f3e17] text-base">Lịch sử Viện phí & Hóa đơn điện tử</h3>
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
                        <thead className="bg-[#e1f4df]/40 text-[#0f3e17] font-bold text-[11px]">
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
                              <td className="p-3 font-mono font-bold text-[#0f3e17]">{inv.invoiceCode}</td>
                              <td className="p-3 text-[#222222]/70">{String(inv.createdAt ?? "").substring(0, 10)}</td>
                              <td className="p-3 font-semibold text-[#222222]">
                                {(inv.invoiceDetails ?? []).map((d: any) => d.service?.name ?? d.serviceName ?? "").join(", ") || "Viện phí"}
                              </td>
                              <td className="p-3 font-bold text-[#0f3e17]">
                                {(inv.totalAmount ?? 0).toLocaleString("vi-VN")} đ
                              </td>
                              <td className="p-3 text-[#222222]/70">{inv.paymentMethod ?? ""}</td>
                              <td className="p-3">
                                <span className="bg-[#e1f4df] text-[#0f3e17] px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border border-[#cfe7d3]">
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
            </div>
          )}

          {/* QR CODE MODAL FOR KIOSK CHECK-IN */}
          {selectedTicketForQr && (
            <div className="fixed inset-0 z-50 bg-[#0f3e17]/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#fffefc] rounded-[14px] p-6 sm:p-8 max-w-sm w-full border border-[#efeeeb] text-center space-y-4">
                <div className="w-12 h-12 rounded-[14px] bg-[#e1f4df] text-[#0f3e17] flex items-center justify-center mx-auto border border-[#cfe7d3]">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0f3e17]">Mã QR Check-in Tự Động</h3>
                  <p className="text-xs text-[#222222]/70">Đưa mã này vào mắt đọc camera tại Kiosk sảnh</p>
                </div>

                {/* QR Display */}
                <div className="p-4 bg-[#fffefc] rounded-[14px] border border-[#cfe7d3] inline-block mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      selectedTicketForQr.code
                    )}`}
                    alt="Mã QR vé hẹn"
                    className="w-44 h-44 object-contain mx-auto"
                  />
                  <p className="font-mono font-black text-xl text-[#0f3e17] mt-2 tracking-widest">
                    {selectedTicketForQr.code}
                  </p>
                </div>

                <div className="text-xs text-[#222222]/80 bg-[#e1f4df]/30 p-3.5 rounded-[14px] border border-[#cfe7d3] text-left space-y-1">
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
