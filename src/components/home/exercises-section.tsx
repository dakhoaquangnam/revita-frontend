"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clock,
  ArrowRight,
  Share2,
  AlertTriangle,
  PlayCircle,
  Check,
} from "lucide-react";

// Danh sách các cẩm nang bài tập PHCN tại nhà chuẩn y khoa
const HOME_REHAB_EXERCISES = [
  {
    id: "ex-stroke-hand",
    category: "Đột quỵ & Tai biến",
    title: "5 bài tập phục hồi chức năng ngón tay & bàn tay sau tai biến",
    target: "Bệnh nhân liệt/yếu nửa người sau đột quỵ, co cứng cơ gấp bàn tay",
    duration: "15 phút / ngày",
    level: "Cơ bản - Có trợ giúp",
    stepsCount: 5,
    summary:
      "Tập trung vào ức chế mẫu co cứng gấp, kéo giãn các ngón tay và kích hoạt cử động duỗi chủ động kết hợp bài tập cầm nắm bóng mềm.",
    cautions: "Không kéo giãn thô bạo gây tổn thương bao khớp; tập trong giới hạn không đau.",
    highlight: "Kỹ thuật Bobath & Brunnstrom",
    tone: "bg-[#e1f4df]", // Keylime Wash
  },
  {
    id: "ex-spine-herniation",
    category: "Cột sống & Thoát vị",
    title: "Chuỗi bài tập McKenzie & Ổn định cơ lõi (Core) cho người thoát vị đĩa đệm",
    target: "Bệnh nhân đau thắt lưng mạn tính, đau thần kinh tọa giai đoạn ổn định",
    duration: "20 phút / ngày",
    level: "Trung bình",
    stepsCount: 6,
    summary:
      "Động tác ưỡn lưng McKenzie giúp đẩy nhân đệm về trung tâm, phối hợp bài tập Bird-Dog và Deadbug gia cố hệ thống cơ sàn chậu và cơ ngang bụng.",
    cautions: "Dừng ngay nếu cảm giác đau lan xuống bàn chân (hiện tượng ngoại vi hóa).",
    highlight: "Giảm chèn ép rễ thần kinh",
    tone: "bg-[#b1dbb8]/40", // Sage Mist
  },
  {
    id: "ex-knee-acl",
    category: "Sau phẫu thuật",
    title: "Phục hồi khớp gối tuần 2-6 sau mổ tái tạo dây chằng chéo trước (ACL)",
    target: "Bệnh nhân sau phẫu thuật nội soi tái tạo ACL, thay khớp gối nhân tạo",
    duration: "25 phút / ngày",
    level: "Theo tiến trình",
    stepsCount: 4,
    summary:
      "Rèn luyện gồng cơ tĩnh tứ đầu đùi (Quad sets), nâng chân thẳng có nẹp, trượt gót chân trên giường để đạt góc gập 90 độ an toàn.",
    cautions: "Mang nẹp khóa góc theo đúng chỉ định của bác sĩ phẫu thuật.",
    highlight: "Chống teo cơ đùi",
    tone: "bg-[#b6ced5]/50", // Slate Hush
  },
  {
    id: "ex-neck-shoulder",
    category: "Cơ xương khớp",
    title: "Giải tỏa căng cứng cổ vai gáy & Hội chứng đầu đưa ra trước (Forward Head)",
    target: "Người đau mỏi vai gáy kinh niên, dân văn phòng ngồi máy tính nhiều",
    duration: "10 phút / ngày",
    level: "Dễ thực hiện",
    stepsCount: 4,
    summary:
      "Bài tập thụt cằm (Chin Tuck) tăng cường cơ gấp cổ sâu, kéo giãn cơ thang trên và cơ ngực lớn giúp mở rộng lồng ngực và trả lại đường cong sinh lý cổ.",
    cautions: "Thực hiện chậm rãi, giữ nhịp thở đều trong 15-20 giây mỗi hiệp.",
    highlight: "Thực hiện ngay tại bàn làm việc",
    tone: "bg-[#cfe7d3]", // Mint Veil
  },
];

export function ExercisesSection() {
  const [activeCategory, setActiveCategory] = useState<string>("Tất cả");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ["Tất cả", "Đột quỵ & Tai biến", "Cột sống & Thoát vị", "Sau phẫu thuật", "Cơ xương khớp"];

  const filteredExercises =
    activeCategory === "Tất cả"
      ? HOME_REHAB_EXERCISES
      : HOME_REHAB_EXERCISES.filter((item) => item.category === activeCategory);

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
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0f3e17] mb-2">
              CẨM NANG Y TẾ CHÍNH THỨC
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#0f3e17] tracking-tight mt-1">
              Bài tập Phục hồi chức năng tại nhà
            </h2>
            <p className="text-[15px] text-[#222222]/80 max-w-2xl mt-2 font-light leading-relaxed">
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

        {/* Category Filter Pills: Đổi sang góc 8px phẳng gọn gàng */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-[#0f3e17] text-[#fffefc] border border-[#0f3e17]"
                  : "bg-[#fffefc] text-[#0f3e17] border border-[#efeeeb] hover:bg-[#e1f4df]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Exercises Grid: Botanical Tinted Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredExercises.map((exercise) => (
            <div
              key={exercise.id}
              id={exercise.id}
              className={`${exercise.tone} rounded-[14px] p-8 flex flex-col justify-between transition-all border border-transparent hover:border-[#0f3e17]/15`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-[6px] px-2.5 py-1 bg-[#fffefc] border border-[#efeeeb] text-[#0f3e17] text-[11px] font-medium">
                    {exercise.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#0f3e17]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{exercise.duration}</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[#0f3e17] leading-snug">
                  {exercise.title}
                </h3>

                <p className="text-[13px] text-[#222222]/80 leading-relaxed font-light">
                  {exercise.summary}
                </p>

                {/* Khung viền chung cho cả Chỉ định & Lưu ý */}
                <div className="rounded-[10px] border border-[#0f3e17]/15 bg-[#fffefc]/50 p-3.5 space-y-2.5">
                  <div className="text-[12.5px] text-[#222222]/85 leading-relaxed">
                    <span className="font-semibold text-[#0f3e17]">Chỉ định:</span> {exercise.target}
                  </div>

                  <div className="flex items-start gap-2 text-[12px] text-[#222222]/80 leading-relaxed pt-2 border-t border-[#0f3e17]/10">
                    <AlertTriangle className="w-4 h-4 text-[#0f3e17]/85 shrink-0 mt-0.5" />
                    <span><span className="font-semibold text-[#0f3e17]">Lưu ý:</span> {exercise.cautions}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 mt-6 border-t border-[#0f3e17]/10 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#0f3e17] uppercase tracking-wider">
                  {exercise.highlight}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleShare(exercise.id, exercise.title)}
                    className="p-2 rounded-[7px] text-[#0f3e17] hover:bg-[#fffefc] transition-colors"
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
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f3e17] hover:translate-x-0.5 transition-transform"
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
