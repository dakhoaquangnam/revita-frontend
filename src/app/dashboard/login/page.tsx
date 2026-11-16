"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Stethoscope,
  Users,
  CreditCard,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TsLogo } from "@/components/ui/ts-logo";

export default function DashboardLoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectByRole = (role: string) => {
    switch (role) {
      case "DOCTOR":
        router.push("/dashboard/doctor");
        break;
      case "RECEPTIONIST":
        router.push("/dashboard/receptionist");
        break;
      case "CASHIER":
        router.push("/dashboard/cashier");
        break;
      case "ADMIN":
        router.push("/dashboard/admin");
        break;
      default:
        router.push("/dashboard");
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ Email/Số điện thoại và Mật khẩu");
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await login(
        { identifier: identifier.trim(), password },
        rememberMe,
      );
      setSuccessMsg(`Đăng nhập thành công: ${user.name}`);
      setTimeout(() => {
        redirectByRole(user.role);
      }, 500);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffefc] text-[#222222] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="flex justify-center items-center gap-3 mb-5">
          <TsLogo size="lg" showText={true} />
          <span className="text-[#0f3e17] bg-[#e1f4df] border border-[#efeeeb] text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">
            PORTAL
          </span>
        </div>

        <h2 className="text-center text-xl sm:text-2xl font-display-serif tracking-[-0.01em] text-[#0f3e17]">
          Đăng nhập Nhân viên & Quản trị
        </h2>
        <p className="mt-1 text-center text-xs text-[#222222]/70">
          Truy cập phân hệ điều phối buồng khám, gọi số, cẩm nang và hồ sơ bệnh án
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 space-y-6">
        {/* ===================== KHỐI 1: FORM ĐĂNG NHẬP CHÍNH ===================== */}
        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-6 sm:p-8">
          {/* Alerts */}
          {errorMsg && (
            <div className="mt-3 p-3.5 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-3 p-3.5 rounded-[14px] bg-[#e1f4df] border border-[#efeeeb] text-[#0f3e17] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0f3e17] flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleManualLogin} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                Email hoặc Số điện thoại nhân viên
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#222222]/40">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="contact@bsthanhsang.com hoặc 0369117117"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-sm text-[#222222] placeholder-[#222222]/40 focus:outline-none focus:border-[#0f3e17] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#222222]/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-sm text-[#222222] placeholder-[#222222]/40 focus:outline-none focus:border-[#0f3e17] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#222222]/40 hover:text-[#0f3e17]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#222222]/70 hover:text-[#0f3e17]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#efeeeb] text-[#0f3e17] focus:ring-[#0f3e17]"
                />
                Ghi nhớ phiên làm việc trên máy này
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full mt-2 py-3 px-4 rounded-[14px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="inline-block animate-spin mr-1">↻</span>
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {isSubmitting ? "Đang xác thực bảo mật..." : "Đăng nhập Không gian làm việc"}
            </button>
          </form>

          {/* Quick links */}
          <div className="mt-5 pt-4 border-t border-[#efeeeb] flex items-center justify-between text-xs text-[#222222]/70 font-medium">
            <Link href="/" className="hover:text-[#0f3e17] transition-colors">
              ← Về Cổng thông tin người bệnh
            </Link>
            <div className="flex gap-3">
              <Link href="/kiosk" className="hover:text-[#0f3e17] transition-colors">
                Kiosk lấy số
              </Link>
              <span>•</span>
              <Link href="/tv-display" className="hover:text-[#0f3e17] transition-colors">
                TV Sảnh chờ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
