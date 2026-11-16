"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clock,
  ArrowRight,
  Share2,
  Check,
} from "lucide-react";

// Danh sách các cẩm nang bài tập PHCN tại nhà chuẩn y khoa
const HOME_REHAB_EXERCISES = [
  {
    id: "ex-stroke-hand",
    category: "Đột quỵ & Tai biến",
    title: "5 bài tập phục hồi chức năng ngón tay & bàn tay sau tai biến",
    duration: "15 phút / ngày",
    level: "Cơ bản - Có trợ giúp",
    stepsCount: 5,
    summary:
      "Tập trung vào ức chế mẫu co cứng gấp, kéo giãn các ngón tay và kích hoạt cử động duỗi chủ động kết hợp bài tập cầm nắm bóng mềm.",
    highlight: "Kỹ thuật Bobath & Brunnstrom",
    tone: "bg-[#e1f4df]", // Keylime Wash
  },
  {
    id: "ex-spine-herniation",
    category: "Cột sống & Thoát vị",
    title: "Chuỗi bài tập McKenzie & Ổn định cơ lõi (Core) cho người thoát vị đĩa đệm",
    duration: "20 phút / ngày",
    level: "Trung bình",
    stepsCount: 6,
    summary:
      "Động tác ưỡn lưng McKenzie giúp đẩy nhân đệm về trung tâm, phối hợp bài tập Bird-Dog và Deadbug gia cố hệ thống cơ sàn chậu và cơ ngang bụng.",
    highlight: "Giảm chèn ép rễ thần kinh",
    tone: "bg-[#b1dbb8]", // Sage Mist
  },
  {
    id: "ex-knee-acl",
    category: "Sau phẫu thuật",
    title: "Phục hồi khớp gối tuần 2-6 sau mổ tái tạo dây chằng chéo trước (ACL)",
    duration: "25 phút / ngày",
    level: "Theo tiến trình",
    stepsCount: 4,
    summary:
      "Rèn luyện gồng cơ tĩnh tứ đầu đùi (Quad sets), nâng chân thẳng có nẹp, trượt gót chân trên giường để đạt góc gập 90 độ an toàn.",
    highlight: "Chống teo cơ đùi",
    tone: "bg-[#b6ced5]", // Slate Hush
  },
  {
    id: "ex-neck-shoulder",
    category: "Cơ xương khớp",
    title: "Giải tỏa căng cứng cổ vai gáy & Hội chứng đầu đưa ra trước (Forward Head)",
    duration: "10 phút / ngày",
    level: "Dễ thực hiện",
    stepsCount: 4,
    summary:
      "Bài tập thụt cằm (Chin Tuck) tăng cường cơ gấp cổ sâu, kéo giãn cơ thang trên và cơ ngực lớn giúp mở rộng lồng ngực và trả lại đường cong sinh lý cổ.",
    highlight: "Thực hiện ngay tại bàn làm việc",
    tone: "bg-[#cfe7d3]", // Mint Veil
  },
];

export function ExercisesSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = (id: string, title: string) => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/#${id}`;
      navigator.clipboard?.writeText(shareUrl).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2500);
      });
    }
  };

  return (
    <section id="bai-tap-phcn" className="py-24 bg-[#fffefc] border-b border-[#efeeeb]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <span className="block eyebrow text-[#0f3e17] mb-2">
              CẨM NANG Y TẾ CHÍNH THỨC
            </span>
            <h2 className="text-3xl sm:text-4xl font-display-serif text-[#0f3e17] tracking-[-0.01em] mt-1">
              Bài tập Phục hồi chức năng tại nhà
            </h2>
            <p className="text-[15px] text-[#222222]/80 max-w-2xl mt-2 font-normal leading-relaxed">
              Biên soạn bởi Bác sĩ Thanh Sang & Đội ngũ Kỹ thuật viên trưởng. Giúp người bệnh duy trì hiệu quả trị liệu sau các buổi tập tại phòng khám.
            </p>
          </div>

          <Link
            href="/dat-lich"
            className="btn-forest text-[14px] py-2.5 px-5"
          >
            <span>Nhận phác đồ tập luyện riêng</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Exercises Grid: Botanical Tinted Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {HOME_REHAB_EXERCISES.map((exercise) => (
            <div
              key={exercise.id}
              id={exercise.id}
              className={`${exercise.tone} rounded-[14px] p-8 flex flex-col justify-between transition-all`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full px-2.5 py-1 bg-[#fffefc] border border-[#efeeeb] text-[#0f3e17] text-[11px] font-medium">
                    {exercise.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#0f3e17]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{exercise.duration}</span>
                  </div>
                </div>

                <h3 className="text-2xl font-display-serif-medium text-[#0c2f10] leading-snug">
                  {exercise.title}
                </h3>

                <p className="text-[13px] text-[#222222]/80 leading-relaxed font-normal">
                  {exercise.summary}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 mt-6 border-t border-[#efeeeb] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#0f3e17] uppercase tracking-wider">
                  {exercise.highlight}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleShare(exercise.id, exercise.title)}
                    className="p-2 rounded-[14px] text-[#0f3e17] hover:bg-[#fffefc] transition-colors"
                    title="Sao chép liên kết chia sẻ cho người nhà qua Zalo/Facebook"
                  >
                    {copiedId === exercise.id ? (
                      <Check className="w-4 h-4 text-[#0f3e17]" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>

                  <Link
                    href={`/dat-lich?exercise=${exercise.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f3e17] hover:translate-x-0.5 transition-transform"
                  >
                    <span>Hướng dẫn 1:1</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
