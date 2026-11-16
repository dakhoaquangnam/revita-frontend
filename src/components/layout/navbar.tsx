"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Phone, Calendar, Menu, X, ArrowRight } from "lucide-react";
import { TsLogo } from "@/components/ui/ts-logo";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#fffefc]/90 backdrop-blur-md border-b border-[#efeeeb] transition-all">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Brand: Biểu tượng TS + THANH SANG PHỤC HỒI CHỨC NĂNG */}
          <Link
            href="/"
            className="group flex items-center shrink-0"
            title="Phòng khám Phục hồi chức năng Bác sĩ Thanh Sang"
          >
            <TsLogo size="md" showText={true} />
          </Link>

          {/* Desktop Nav Items: Lần lượt Chuyên khoa, Bác sĩ, Bài tập, Hỏi đáp, Quy trình, Hồ sơ */}
          <nav className="hidden md:flex items-center gap-3 lg:gap-5 xl:gap-6 text-[14px] lg:text-[15px] font-medium text-[#222222]">
            <Link
              href="#chuyen-khoa"
              className="hover:text-[#0f3e17] py-1 px-1.5 rounded-full transition-colors whitespace-nowrap"
            >
              Chuyên khoa
            </Link>
            <Link
              href="#bac-si"
              className="hover:text-[#0f3e17] py-1 px-1.5 rounded-full transition-colors whitespace-nowrap"
            >
              Bác sĩ
            </Link>
            <Link
              href="#bai-tap-phcn"
              className="hover:text-[#0f3e17] py-1 px-1.5 rounded-full transition-colors whitespace-nowrap"
            >
              Bài tập
            </Link>
            <Link
              href="/bai-viet"
              className="hover:text-[#0f3e17] py-1 px-1.5 rounded-full transition-colors whitespace-nowrap"
            >
              Bài viết
            </Link>
            <Link
              href="/tro-ly-ai"
              className="hover:text-[#0f3e17] py-1 px-1.5 rounded-full transition-colors whitespace-nowrap"
            >
              Hỏi đáp
            </Link>
            <Link
              href="#quy-trinh"
              className="hover:text-[#0f3e17] py-1 px-1.5 rounded-full transition-colors whitespace-nowrap"
            >
              Quy trình
            </Link>
            <Link
              href="/tai-khoan"
              className="hover:text-[#0f3e17] py-1 px-1.5 rounded-full transition-colors whitespace-nowrap"
            >
              Hồ sơ
            </Link>
          </nav>

          {/* Action Buttons: Lần lượt Nội bộ và Đặt lịch */}
          <div className="hidden md:flex items-center gap-2.5 lg:gap-3 shrink-0">
            <Link
              href="/dashboard/login"
              className="text-[13px] font-semibold text-[#0f3e17] hover:text-[#0c2f10] px-3.5 py-2 rounded-[14px] bg-[#e1f4df] hover:bg-[#cfe7d3] transition-colors border border-[#efeeeb] whitespace-nowrap"
              title="Cổng làm việc Bác sĩ / Lễ tân / Thu ngân"
            >
              Nội bộ
            </Link>

            <Link
              href="/dat-lich"
              className="btn-forest text-[14px] py-2 px-4 lg:px-5 whitespace-nowrap"
            >
              <span>Đặt lịch</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/dat-lich"
              className="bg-[#0f3e17] text-[#fffefc] p-2.5 rounded-[14px] text-xs font-medium"
              aria-label="Đặt lịch khám"
            >
              <Calendar className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-[14px] text-[#222222] hover:text-[#0f3e17] hover:bg-[#e1f4df]"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer: Đồng bộ danh sách menu lần lượt */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#efeeeb] bg-[#fffefc] px-4 pt-4 pb-6 space-y-1.5">
          <Link
            href="#chuyen-khoa"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-[14px] text-[15px] font-medium text-[#222222] hover:bg-[#e1f4df]"
          >
            Chuyên khoa
          </Link>
          <Link
            href="#bac-si"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-[14px] text-[15px] font-medium text-[#222222] hover:bg-[#e1f4df]"
          >
            Bác sĩ
          </Link>
          <Link
            href="#bai-tap-phcn"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-[14px] text-[15px] font-medium text-[#222222] hover:bg-[#e1f4df]"
          >
            Bài tập
          </Link>
          <Link
            href="/bai-viet"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-[14px] text-[15px] font-medium text-[#222222] hover:bg-[#e1f4df]"
          >
            Bài viết
          </Link>
          <Link
            href="/tro-ly-ai"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-[14px] text-[15px] font-medium text-[#0f3e17] bg-[#e1f4df]/60"
          >
            Hỏi đáp
          </Link>
          <Link
            href="#quy-trinh"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-[14px] text-[15px] font-medium text-[#222222] hover:bg-[#e1f4df]"
          >
            Quy trình
          </Link>
          <Link
            href="/tai-khoan"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-[14px] text-[15px] font-medium text-[#222222] hover:bg-[#e1f4df]"
          >
            Hồ sơ
          </Link>
          <Link
            href="/dashboard/login"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-[14px] text-[15px] font-semibold text-[#0f3e17] bg-[#e1f4df]"
          >
            Nội bộ
          </Link>
          <Link
            href="/dat-lich"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-[14px] text-[15px] font-semibold text-[#fffefc] bg-[#0f3e17] text-center mt-2"
          >
            Đặt lịch
          </Link>
          <div className="pt-3 border-t border-[#efeeeb] mt-2">
            <a
              href="tel:0369117117"
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#0f3e17]"
            >
              <Phone className="w-4 h-4 text-[#0f3e17]" />
              <span>Hotline: 0369.117.117</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
