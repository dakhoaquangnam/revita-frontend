"use client";

import React from "react";
import Link from "next/link";
import { HeartHandshake, Bone, Brain, Heart, Baby, Hand, ArrowRight } from "lucide-react";

// Danh mục chuyên khoa PHCN chuẩn hóa
const CORE_REHAB_SPECIALTIES = [
  {
    code: "STROKE",
    name: "PHCN Sau Đột Quỵ & Tai Biến",
    icon: Brain,
    description: "Tập luyện phục hồi liệt nửa người, rối loạn thăng bằng, tái rèn luyện dáng đi và hoạt động sinh hoạt hàng ngày (ADL).",
    tag: "Chuyên sâu",
    cardTone: "bg-[#e1f4df]", // Keylime Wash
  },
  {
    code: "SPINE_JOINT",
    name: "Cơ Xương Khớp & Thoát Vị Đĩa Đệm",
    icon: Bone,
    description: "Trị liệu không phẫu thuật cho thoái hóa cột sống, đau thần kinh tọa, viêm quanh khớp vai, thoái hóa khớp gối bằng máy kéo giãn và bài tập cơ lõi.",
    tag: "Phổ biến",
    cardTone: "bg-[#b1dbb8]/40", // Soft Sage
  },
  {
    code: "POST_SURGERY",
    name: "PHCN Sau Phẫu Thuật & Chấn Thương",
    icon: HeartHandshake,
    description: "Phục hồi tầm vận động sau mổ tái tạo dây chằng chéo (ACL), gãy xương, thay khớp háng, khớp gối nhân tạo.",
    tag: "Liệu trình 1:1",
    cardTone: "bg-[#b6ced5]/50", // Slate Hush
  },
  {
    code: "HAND_OT",
    name: "Hoạt Động Trị Liệu & Bàn Tay",
    icon: Hand,
    description: "Phục hồi cử động khéo léo của các ngón tay, cầm nắm đồ vật, hỗ trợ bệnh nhân tái hòa nhập công việc và cuộc sống.",
    tag: "Kỹ thuật cao",
    cardTone: "bg-[#cfe7d3]", // Mint Veil
  },
  {
    code: "PEDIATRIC",
    name: "PHCN Nhi Khoa & Vận Động Trẻ Em",
    icon: Baby,
    description: "Can thiệp sớm bại não, vẹo cổ do xơ hóa cơ ức đòn chũm, bàn chân khoèo, chậm mốc phát triển vận động ở trẻ.",
    tag: "Nhẹ nhàng",
    cardTone: "bg-[#e1f4df]", // Keylime Wash
  },
  {
    code: "CARDIAC_RESP",
    name: "PHCN Tim Mạch & Hô Hấp",
    icon: Heart,
    description: "Rèn luyện thể lực an toàn theo phân tầng nguy cơ tim mạch, phục hồi thông khí phổi sau bệnh phổi mạn tính (COPD).",
    tag: "Theo dõi Monitor",
    cardTone: "bg-[#b1dbb8]/40", // Soft Sage
  },
];

export function SpecialtiesSection() {
  return (
    <section id="chuyen-khoa" className="py-24 bg-[#fffefc] border-b border-[#efeeeb]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#0f3e17] tracking-tight">
              Các chuyên khoa Phục hồi chức năng
            </h2>
            <p className="text-[15px] text-[#222222]/80 max-w-2xl mt-2 font-light leading-relaxed">
              Trang bị hệ thống máy tập hiện đại kết hợp kỹ thuật nắn chỉnh tay (Manual Therapy) và phác đồ lượng giá FIM chuẩn y khoa cho từng bệnh lý.
            </p>
          </div>
          <Link
            href="/dat-lich"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f3e17] hover:text-[#0c2f10] transition-colors shrink-0"
          >
            <span>Đặt hẹn chuyên khoa</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid of Flat Botanical Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CORE_REHAB_SPECIALTIES.map((spec) => {
            const Icon = spec.icon;
            return (
              <div
                key={spec.code}
                className={`${spec.cardTone} rounded-[14px] p-8 flex flex-col justify-between transition-all border border-transparent hover:border-[#0f3e17]/15`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-[12px] bg-[#fffefc] flex items-center justify-center text-[#0f3e17]">
                      <Icon className="w-6 h-6 stroke-[2]" />
                    </div>
                    <span className="text-[12px] font-semibold text-[#0f3e17]/80 tracking-wide">
                      {spec.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#0f3e17] mb-2.5">
                    {spec.name}
                  </h3>

                  <p className="text-[13px] text-[#222222]/80 leading-relaxed font-light">
                    {spec.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[#0f3e17]/10 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[#0f3e17]">
                    Kỹ thuật viên 1:1
                  </span>
                  <Link
                    href={`/dat-lich?specialty=${spec.code}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f3e17] hover:translate-x-0.5 transition-transform"
                  >
                    <span>Đặt lịch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
