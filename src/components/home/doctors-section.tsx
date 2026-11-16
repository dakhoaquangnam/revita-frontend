"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useDoctors } from "@/hooks/use-public-data";
import { Award, Briefcase, Calendar, ShieldCheck, UserRound, CheckCircle2 } from "lucide-react";

// Bác sĩ chủ phòng khám (tài khoản DOCTOR của anh Sang) luôn đứng đầu mục
// "Bác sĩ Thanh Sang & Đội ngũ Chuyên khoa". Danh sách backend trả về xếp
// theo tên A-Z nên sau khi sửa tên "Bs Thanh Sang" -> "Nguyễn Thanh Sang",
// thẻ của anh rơi xuống vị trí thứ 7 và bị slice(0, 6) cắt mất khỏi trang chủ.
const OWNER_DOCTOR_ID = "584944cf-9203-4598-86f6-74ef867ab5fd";

export function DoctorsSection() {
  const { data: doctors, isLoading } = useDoctors();

  const orderedDoctors = useMemo(() => {
    if (!doctors) return [];
    const owner = doctors.find((d) => d.id === OWNER_DOCTOR_ID);
    const rest = doctors.filter((d) => d.id !== OWNER_DOCTOR_ID);
    return owner ? [owner, ...rest] : rest;
  }, [doctors]);

  return (
    <section id="bac-si" className="py-24 bg-[#fffefc] border-b border-[#efeeeb]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-display-serif text-[#0f3e17] tracking-[-0.01em]">
            Bác sĩ Thanh Sang & Đội ngũ Chuyên khoa
          </h2>
          <p className="text-[15px] text-[#222222]/80 mt-3 leading-relaxed font-normal">
            Được đào tạo chính quy, giàu kinh nghiệm thực tế từ các bệnh viện chuyên khoa phục hồi chức năng tuyến đầu, luôn tận tâm đồng hành trên từng bước đi của người bệnh.
          </p>
        </div>

        {/* Loading state skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#fffefc] rounded-[14px] p-7 border border-[#efeeeb] animate-pulse space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-[14px] bg-[#e1f4df]/60"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-[#efeeeb] rounded w-3/4"></div>
                    <div className="h-3 bg-[#efeeeb] rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-16 bg-[#e1f4df]/30 rounded-[14px]"></div>
              </div>
            ))}
          </div>
        )}

        {/* Doctors Grid */}
        {!isLoading && orderedDoctors && orderedDoctors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orderedDoctors.slice(0, 6).map((item, idx) => {
              const docInfo = item.doctor;
              const cardBg = idx % 3 === 0 ? "bg-[#fffefc]" : idx % 3 === 1 ? "bg-[#e1f4df]" : "bg-[#b6ced5]";
              const isTintedCard = cardBg !== "bg-[#fffefc]";
              return (
                <div
                  key={item.id}
                  className={`${cardBg} rounded-[14px] p-7 border border-[#efeeeb] flex flex-col justify-between transition-colors`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-[14px] bg-[#e1f4df] border border-[#efeeeb] flex items-center justify-center text-[#0f3e17] shrink-0">
                        <UserRound className="w-8 h-8" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#0f3e17]/70">
                            {docInfo?.doctorCode || "Bác sĩ CKI"}
                          </span>
                          <div className="flex items-center gap-1 text-xs font-semibold text-[#0f3e17]">
                            <Award className="w-3.5 h-3.5 text-[#0f3e17]" />
                            <span>{docInfo?.rating || 4.9}</span>
                          </div>
                        </div>

                        <h3 className={`mt-1.5 truncate ${isTintedCard ? "text-xl font-display-serif-medium text-[#0c2f10]" : "text-lg font-display-serif text-[#0f3e17]"}`}>
                          BS. {item.name}
                        </h3>

                        <p className="text-xs text-[#222222]/70 flex items-center gap-1 mt-0.5">
                          <Award className="w-3.5 h-3.5 text-[#0f3e17]" />
                          <span>{docInfo?.yearsExperience || 8}+ năm kinh nghiệm</span>
                        </p>
                      </div>
                    </div>

                    {/* Workplace & Description */}
                    <div className="text-xs text-[#222222]/80 bg-[#fffefc] p-3.5 rounded-[14px] border border-[#efeeeb] space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[#0f3e17] font-semibold">
                        <Briefcase className="w-3.5 h-3.5 text-[#0f3e17] shrink-0" />
                        <span className="truncate">{docInfo?.workHistory || "Khoa Phục hồi chức năng BV Chuyên khoa"}</span>
                      </div>
                      <p className="line-clamp-2 text-[#222222]/70 leading-relaxed">
                        {docInfo?.description || "Chuyên điều trị tổn thương thần kinh, lượng giá chức năng và phục hồi vận động sau đột quỵ."}
                      </p>
                    </div>
                  </div>

                  {/* Booking CTA */}
                  <div className="pt-4 mt-4 border-t border-[#efeeeb] flex items-center justify-between">
                    <span className="text-xs text-[#222222]/60 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0f3e17]" />
                      Lịch khám tuần này
                    </span>
                    <Link
                      href="#dat-lich"
                      className="inline-flex items-center gap-1.5 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] text-xs font-semibold px-4 py-2 rounded-[14px] transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Đặt lịch khám</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
