import React from "react";
import Link from "next/link";
import { Phone, Mail, MapPin, Clock, ShieldCheck, HeartHandshake, Bot } from "lucide-react";
import { TsLogo } from "@/components/ui/ts-logo";

export function Footer() {
  return (
    <footer className="bg-[#0f3e17] text-[#fffefc] pt-20 pb-12 border-t border-[#0c2f10]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Info */}
          <div className="space-y-4">
            <TsLogo size="md" textVariant="light" iconVariant="white" />
            <p className="text-[13px] text-[#b1dbb8] leading-relaxed font-light">
              Phòng khám Chuyên khoa Phục hồi chức năng & Vật lý trị liệu Bác sĩ Thanh Sang. Lượng giá chức năng FIM toàn diện, thiết kế phác đồ cá nhân hóa, đồng hành cùng bệnh nhân phục hồi vận động tối ưu.
            </p>
            <div className="rounded-[6px] bg-[#0c2f10] text-[#b1dbb8] border border-[#b1dbb8]/20 px-3 py-1.5 inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#b1dbb8]" />
              <span className="text-[11px]">Giấy phép KBCB số: 09876/BYT-GPHĐ</span>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-[#e1f4df] text-[11px] font-semibold tracking-widest uppercase mb-4">
              Thông tin liên hệ
            </h4>
            <ul className="space-y-3.5 text-[13px] text-[#b1dbb8] font-light">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#e1f4df] shrink-0 mt-0.5" />
                <span>193 Quang Trung, Đại Lộc, Đà Nẵng</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#e1f4df] shrink-0" />
                <a href="tel:0369117117" className="hover:text-white transition-colors font-medium">
                  Hotline: 0369.117.117
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#e1f4df] shrink-0" />
                <a href="mailto:contact@bsthanhsang.com" className="hover:text-white transition-colors">
                  contact@bsthanhsang.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#e1f4df] shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Thứ 2 - Thứ 7: 7h30 - 19h30</p>
                  <p className="text-[11px] text-[#b1dbb8]/80">Chủ nhật: 8h00 - 12h00 (Đặt lịch trước)</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[#e1f4df] text-[11px] font-semibold tracking-widest uppercase mb-4">
              Chuyên khoa Phục hồi
            </h4>
            <ul className="space-y-2.5 text-[13px] text-[#b1dbb8] font-light">
              <li>
                <Link href="#chuyen-khoa" className="hover:text-white transition-colors">
                  Phục hồi chức năng sau Tai biến
                </Link>
              </li>
              <li>
                <Link href="#chuyen-khoa" className="hover:text-white transition-colors">
                  Trị liệu Thoát vị đĩa đệm cột sống
                </Link>
              </li>
              <li>
                <Link href="#chuyen-khoa" className="hover:text-white transition-colors">
                  Phục hồi sau Phẫu thuật Dây chằng (ACL)
                </Link>
              </li>
              <li>
                <Link href="#chuyen-khoa" className="hover:text-white transition-colors">
                  Sóng xung kích Shockwave giảm đau gân cơ
                </Link>
              </li>
              <li>
                <Link href="/tro-ly-ai" className="hover:text-white transition-colors inline-flex items-center gap-1.5 text-[#e1f4df]">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Hỏi Bác sĩ AI (Tư vấn 24/7)</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Electronic Portals */}
          <div>
            <h4 className="text-[#e1f4df] text-[11px] font-semibold tracking-widest uppercase mb-4">
              Cổng dịch vụ Điện tử
            </h4>
            <div className="space-y-2.5">
              <Link
                href="/dat-lich"
                className="block p-3 rounded-[12px] bg-[#0c2f10] hover:bg-[#0c2f10]/80 border border-[#b1dbb8]/20 transition-all"
              >
                <div className="font-medium text-white text-xs">Đặt lịch hẹn Khám 1:1</div>
                <div className="text-[11px] text-[#b1dbb8]">Chọn bác sĩ & thanh toán cọc VietQR</div>
              </Link>

              <Link
                href="/tai-khoan"
                className="block p-3 rounded-[12px] bg-[#0c2f10] hover:bg-[#0c2f10]/80 border border-[#b1dbb8]/20 transition-all"
              >
                <div className="font-medium text-white text-xs">Tra cứu Hồ sơ & Điểm FIM</div>
                <div className="text-[11px] text-[#b1dbb8]">Xem đơn thuốc và bài tập tại nhà</div>
              </Link>

              <div className="flex gap-2 pt-1 text-[11px] text-[#b1dbb8]">
                <Link href="/kiosk" className="hover:text-white underline">
                  Kiosk sảnh
                </Link>
                <span>•</span>
                <Link href="/tv-display" className="hover:text-white underline">
                  TV gọi số
                </Link>
                <span>•</span>
                <Link href="/dashboard/login" className="hover:text-white underline">
                  Cổng nội bộ
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 border-t border-[#0c2f10] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#b1dbb8]/70">
          <p>© 2026 PHÒNG KHÁM BÁC SĨ THANH SANG. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-6">
            <span className="hover:text-[#fffefc] transition-colors">193 Quang Trung, Đại Lộc, Đà Nẵng</span>
            <span>•</span>
            <span className="hover:text-[#fffefc] transition-colors">Hotline: 0369.117.117</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
