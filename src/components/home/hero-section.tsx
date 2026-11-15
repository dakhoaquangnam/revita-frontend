import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Stethoscope, ShieldCheck, MapPin, Phone } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#fffefc] pt-10 pb-16 md:pt-14 md:pb-20 border-b border-[#efeeeb]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Main Hero Panel: Keylime Wash background with generous padding & 14px radius */}
        <div className="bg-[#e1f4df] rounded-[14px] p-8 sm:p-12 lg:p-14 border border-[#cfe7d3]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Typography & CTAs (Max 4-stack text element discipline) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Eyebrow Tag: 999px pill per Ease Health standard */}
              <div className="inline-flex items-center gap-2 bg-[#fffefc] border border-[#0f3e17]/15 px-3.5 py-1 rounded-full text-[11px] font-semibold text-[#0f3e17] uppercase tracking-[0.08em]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0f3e17]" />
                <span>Phòng Khám Phục Hồi Chức Năng Bác Sĩ Thanh Sang</span>
              </div>

              {/* 2. Headline: 2 lines max */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-semibold text-[#0f3e17] tracking-tight leading-[1.12]">
                Phục hồi vận động, <br className="hidden sm:inline" />
                <span className="font-normal text-[#0c2f10]/80">tìm lại cuộc sống chủ động</span>
              </h1>

              {/* 3. Subtext: < 25 words */}
              <p className="text-[15px] text-[#222222]/80 max-w-[50ch] leading-relaxed font-light">
                Đồng hành chuyên sâu cùng người bệnh sau tai biến, chấn thương thể thao và đau nhức cơ xương khớp bằng phác đồ lượng giá FIM & ROM chuẩn quốc tế.
              </p>

              {/* 4. Action Buttons: Primary Forest Button + Clean Secondary */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <Link
                  href="/dat-lich"
                  className="btn-forest text-[15px] py-3 px-6"
                >
                  <span>Đặt lịch khám Bác sĩ</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/tro-ly-ai"
                  className="inline-flex items-center justify-center gap-2 bg-[#fffefc] hover:bg-[#fffefc]/80 text-[#0f3e17] font-medium text-[15px] px-6 py-3 rounded-[14px] border border-[#efeeeb] transition-colors"
                >
                  <span>Hỏi Bác sĩ AI (24/7)</span>
                  <ArrowRight className="w-4 h-4 text-[#0f3e17]" />
                </Link>
              </div>
            </div>

            {/* Right Column: Slate Product Panel & Cream Inner Preview */}
            <div className="lg:col-span-5">
              <div className="bg-[#b6ced5] rounded-[14px] p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#0f3e17] uppercase tracking-wider">
                    Quy Trình Lâm Sàng FIM
                  </span>
                  <span className="rounded-full bg-[#fffefc] border border-[#efeeeb] px-2.5 py-0.5 text-[10px] font-semibold text-[#0f3e17]">
                    Chuẩn hóa Quốc tế
                  </span>
                </div>

                {/* Inner Cream Paper Card */}
                <div className="bg-[#fffefc] rounded-[14px] p-5 space-y-3.5">
                  <div className="flex items-center gap-3 pb-3 border-b border-[#efeeeb]">
                    <div className="w-9 h-9 rounded-[10px] bg-[#e1f4df] flex items-center justify-center text-[#0f3e17]">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-[#0f3e17]">Lượng giá FIM & Đo ROM</h4>
                      <p className="text-[11px] text-[#222222]/70 font-light">Theo dõi tiến trình từng buổi</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-[12px]">
                    <div className="p-2.5 rounded-[10px] bg-[#e1f4df]/60 flex items-start gap-2.5 text-[#0f3e17]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0f3e17] mt-0.5" />
                      <div>
                        <strong>1. Lượng giá ban đầu:</strong> Đo góc khớp ROM goniometer & thang đo độc lập FIM (18 - 126 điểm).
                      </div>
                    </div>

                    <div className="p-2.5 rounded-[10px] bg-[#cfe7d3]/50 flex items-start gap-2.5 text-[#0f3e17]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0f3e17] mt-0.5" />
                      <div>
                        <strong>2. Phác đồ 1 kèm 1:</strong> Tập vận động Bobath, McKenzie, sóng xung kích Shockwave tan điểm co thắt.
                      </div>
                    </div>

                    <div className="p-2.5 rounded-[10px] bg-[#fffefc] border border-[#efeeeb] flex items-start gap-2.5 text-[#222222]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0f3e17] mt-0.5" />
                      <div>
                        <strong>3. Bài tập tại nhà:</strong> Kê đơn bài tập video và theo dõi phản hồi qua cổng cá nhân.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Trust Metrics & Clinic Quick Info Strip Under Hero */}
        <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-5 grid grid-cols-2 md:grid-cols-4 gap-6 items-center text-center">
          <div className="border-r border-[#efeeeb] last:border-0 pr-4">
            <p className="text-2xl font-semibold text-[#0f3e17]">100%</p>
            <p className="text-[12px] text-[#222222]/70 font-light mt-0.5">Bác sĩ chuyên khoa trực tiếp</p>
          </div>
          <div className="border-r border-[#efeeeb] last:border-0 pr-4">
            <p className="text-2xl font-semibold text-[#0f3e17]">1 : 1</p>
            <p className="text-[12px] text-[#222222]/70 font-light mt-0.5">Tập luyện cá nhân hóa</p>
          </div>
          <div className="border-r border-[#efeeeb] last:border-0 pr-4">
            <p className="text-2xl font-semibold text-[#0f3e17]">&gt; 3,500+</p>
            <p className="text-[12px] text-[#222222]/70 font-light mt-0.5">Bệnh nhân phục hồi</p>
          </div>
          <div className="text-left pl-2">
            <div className="text-[11px] font-semibold text-[#0f3e17] uppercase tracking-wider">193 Quang Trung, Đà Nẵng</div>
            <div className="text-xs text-[#222222]/70 font-light mt-0.5">Hotline: <strong className="text-[#0f3e17]">0369.117.117</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}
