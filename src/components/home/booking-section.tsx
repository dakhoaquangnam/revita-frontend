"use client";

import React, { useState } from "react";
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2 } from "lucide-react";
import { useSpecialties, useDoctors } from "@/hooks/use-public-data";

export function BookingSection() {
  const { data: specialties } = useSpecialties();
  const { data: doctors } = useDoctors();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    specialtyId: "",
    doctorId: "",
    date: "2026-11-12",
    timeSlot: "08:30 - 09:30",
    symptoms: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Giả lập booking flow
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
    }, 800);
  };

  return (
    <section id="dat-lich" className="py-24 bg-[#fffefc] border-b border-[#efeeeb] scroll-mt-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#e1f4df] rounded-[14px] p-8 sm:p-12 border border-[#cfe7d3]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Info */}
            <div className="lg:col-span-5 space-y-6">
              <h2 className="text-3xl sm:text-4xl font-semibold text-[#0f3e17] tracking-tight leading-tight">
                Đặt lịch Khám lượng giá & Tư vấn phác đồ
              </h2>

              <p className="text-[#222222]/80 text-sm leading-relaxed font-light">
                Chủ động chọn giờ khám, giảm thiểu tối đa thời gian chờ đợi tại phòng khám. Bác sĩ chuyên khoa sẽ liên hệ xác nhận thông tin trước buổi khám.
              </p>

              <div className="space-y-3.5 pt-2 text-sm text-[#222222]">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0f3e17] shrink-0" />
                  <span>Ưu tiên số thứ tự vào buồng khám đúng giờ</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0f3e17] shrink-0" />
                  <span>Bác sĩ trực tiếp thăm khám và đo tầm vận động</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0f3e17] shrink-0" />
                  <span>Tặng kèm tài liệu hướng dẫn bài tập phục hồi tại nhà</span>
                </div>
              </div>

              <div className="pt-6 border-t border-[#cfe7d3] flex items-center gap-3 text-xs text-[#0f3e17]">
                <span>Hotline hỗ trợ:</span>
                <a href="tel:0369117117" className="text-[#0f3e17] font-bold text-base hover:text-[#0c2f10] transition-colors">
                  0369.117.117
                </a>
              </div>
            </div>

            {/* Right Booking Form */}
            <div className="lg:col-span-7 bg-[#fffefc] text-[#222222] rounded-[14px] p-6 sm:p-8 border border-[#efeeeb]">
              {isSubmitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-[14px] bg-[#e1f4df] text-[#0f3e17] flex items-center justify-center mx-auto border border-[#cfe7d3]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#0f3e17]">
                    Đăng ký lịch khám thành công!
                  </h3>
                  <p className="text-sm text-[#222222]/80 max-w-md mx-auto leading-relaxed">
                    Cảm ơn bạn <strong>{formData.fullName}</strong>. Phòng khám Bác sĩ Thanh Sang đã ghi nhận lịch hẹn vào ngày{" "}
                    <strong>{formData.date}</strong> ({formData.timeSlot}). Nhân viên y tế sẽ gọi điện thoại tới số{" "}
                    <strong>{formData.phone}</strong> để xác nhận trong ít phút.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="inline-flex items-center justify-center text-xs font-semibold text-[#0f3e17] bg-[#e1f4df] hover:bg-[#cfe7d3] px-5 py-2.5 rounded-[14px] transition-colors"
                  >
                    Đặt thêm lịch hẹn khác
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-bold text-[#0f3e17] pb-2 border-b border-[#efeeeb]">
                    Thông tin người khám
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Họ và tên bệnh nhân *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#222222]/40 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="Nguyễn Văn A"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Số điện thoại liên hệ *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#222222]/40 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="0912 345 678"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Chuyên khoa cần khám
                      </label>
                      <select
                        value={formData.specialtyId}
                        onChange={(e) => setFormData({ ...formData, specialtyId: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                      >
                        <option value="">-- Chọn chuyên khoa --</option>
                        {specialties?.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        )) || (
                          <>
                            <option value="1">PHCN Sau Tai Biến / Đột Quỵ</option>
                            <option value="2">Cơ Xương Khớp & Thoát Vị Đĩa Đệm</option>
                            <option value="3">PHCN Sau Phẫu Thuật Dây Chằng (ACL)</option>
                            <option value="4">Hoạt Động Trị Liệu & Bàn Tay</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Bác sĩ mong muốn (Tùy chọn)
                      </label>
                      <select
                        value={formData.doctorId}
                        onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                      >
                        <option value="">-- Bác sĩ khám bất kỳ --</option>
                        {doctors?.map((d) => (
                          <option key={d.id} value={d.id}>
                            BS. {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Ngày khám mong muốn
                      </label>
                      <div className="relative">
                        <CalendarIcon className="w-4 h-4 text-[#222222]/40 absolute left-3 top-3" />
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                        Khung giờ khám
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-[#222222]/40 absolute left-3 top-3" />
                        <select
                          value={formData.timeSlot}
                          onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                        >
                          <option value="08:00 - 09:00">08:00 - 09:00 (Sáng)</option>
                          <option value="09:00 - 10:00">09:00 - 10:00 (Sáng)</option>
                          <option value="10:00 - 11:00">10:00 - 11:00 (Sáng)</option>
                          <option value="14:00 - 15:00">14:00 - 15:00 (Chiều)</option>
                          <option value="15:00 - 16:00">15:00 - 16:00 (Chiều)</option>
                          <option value="17:00 - 18:00">17:00 - 18:00 (Ngoài giờ)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0f3e17] mb-1">
                      Mô tả triệu chứng / Bệnh sử ban đầu
                    </label>
                    <textarea
                      rows={2}
                      value={formData.symptoms}
                      onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                      placeholder="Ví dụ: Đau mỏi thắt lưng lan xuống mông đã 2 tháng; hoặc phục hồi chức năng vận động sau phẫu thuật..."
                      className="w-full px-3 py-2 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] focus:outline-none focus:border-[#0f3e17] transition-all"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm py-3.5 rounded-[14px] transition-colors disabled:opacity-50 mt-2"
                  >
                    {loading ? "Đang gửi đăng ký..." : "Xác nhận đặt lịch khám"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
