import React from "react";
import { ClipboardList, Stethoscope, Dumbbell, Award, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const REHAB_STEPS = [
  {
    step: "01",
    title: "Thăm khám & Lượng giá",
    subtitle: "Toàn diện - Khoa học",
    description:
      "Bác sĩ chuyên khoa trực tiếp đo tầm vận động khớp (ROM), cơ lực (MMT), kiểm tra thăng bằng, phản xạ thần kinh và chấm điểm thang FIM / Barthel.",
    icon: ClipboardList,
    bgClass: "bg-[#d2edcb] border-[#efeeeb]",
    accentPill: "bg-[#0f3e17] text-[#fffefc]",
  },
  {
    step: "02",
    title: "Thiết kế Phác đồ 1:1",
    subtitle: "Mục tiêu rõ ràng",
    description:
      "Lập kế hoạch trị liệu theo từng tuần: Kiểm soát cơn đau, phục hồi chức năng vận động cơ bản và tiến tới tự chủ trong sinh hoạt cá nhân.",
    icon: Stethoscope,
    bgClass: "bg-[#b1dbb8] border-[#efeeeb]",
    accentPill: "bg-[#0f3e17] text-[#fffefc]",
  },
  {
    step: "03",
    title: "Trị liệu Kỹ thuật cao",
    subtitle: "KTV đồng hành 1 kèm 1",
    description:
      "Kỹ thuật di động khớp bằng tay (Manual Therapy) kết hợp dàn máy hiện đại: Sóng xung kích Shockwave, Máy kéo giãn cột sống tự động, Laser công suất cao.",
    icon: Dumbbell,
    bgClass: "bg-[#b6ced5] border-[#efeeeb]",
    accentPill: "bg-[#0f3e17] text-[#fffefc]",
  },
  {
    step: "04",
    title: "Đánh giá lại & Tự tập",
    subtitle: "Duy trì kết quả bền vững",
    description:
      "Lượng giá định kỳ sau mỗi 5 - 10 buổi. Hướng dẫn chi tiết bài tập tại nhà và cách chỉnh tư thế đúng để ngăn ngừa bệnh tái phát.",
    icon: Award,
    bgClass: "bg-[#cfe7d3] border-[#efeeeb]",
    accentPill: "bg-[#0f3e17] text-[#fffefc]",
  },
];

export function RehabProcessSection() {
  return (
    <section id="quy-trinh" className="py-24 bg-[#fffefc] border-b border-[#efeeeb]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-display-serif text-[#0f3e17] tracking-[-0.01em]">
            Quy trình Phục hồi chức năng 4 bước chuẩn hóa
          </h2>
          <p className="text-[15px] text-[#222222]/80 mt-3 leading-relaxed font-normal">
            Chúng tôi không chỉ can thiệp triệu chứng đau tạm thời mà tập trung khôi phục lại toàn bộ chuỗi chức năng vận động tự nhiên của cơ thể.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {REHAB_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className={`rounded-[14px] p-7 border ${item.bgClass} flex flex-col justify-between transition-colors`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-display-serif font-medium text-[#0f3e17] tracking-tight">
                      {item.step}
                    </span>
                    <div className="w-12 h-12 rounded-[14px] bg-[#fffefc] text-[#0f3e17] flex items-center justify-center border border-[#efeeeb]">
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </div>
                  </div>

                  <h3 className="text-lg font-display-serif font-medium text-[#0f3e17]">
                    {item.title}
                  </h3>
                  <p className="text-xs font-medium text-[#0f3e17]/70 mt-0.5">
                    {item.subtitle}
                  </p>

                  <p className="text-sm text-[#222222]/85 leading-relaxed mt-4">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 mt-6 border-t border-[#efeeeb] flex items-center gap-1.5 text-xs text-[#0f3e17]/75 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cam kết chuẩn FIM y khoa</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to action card */}
        <div className="mt-12 p-8 rounded-[14px] bg-[#d2edcb] border border-[#efeeeb] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-display-serif font-medium text-[#0f3e17]">
              Cần tư vấn trực tiếp lộ trình phục hồi phù hợp với bạn?
            </h3>
            <p className="text-sm text-[#222222]/80 mt-1">
              Bác sĩ chuyên khoa Thanh Sang sẵn sàng khám và lượng giá trực tiếp hoặc tư vấn trực tuyến.
            </p>
          </div>
          <Link
            href="/dat-lich"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[14px] bg-[#0f3e17] text-[#fffefc] text-sm font-semibold hover:bg-[#0c2f10] transition-colors flex-shrink-0"
          >
            <span>Đặt lịch lượng giá</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
