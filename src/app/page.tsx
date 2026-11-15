import React from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/home/hero-section";
import { SpecialtiesSection } from "@/components/home/specialties-section";
import { DoctorsSection } from "@/components/home/doctors-section";
import { ExercisesSection } from "@/components/home/exercises-section";
import { RehabProcessSection } from "@/components/home/rehab-process-section";
import { BookingSection } from "@/components/home/booking-section";

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#fffefc] text-[#222222]">
      {/* 1. Header & Navigation */}
      <Navbar />

      {/* 2. Main Sections */}
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection />

        {/* Chuyên khoa trọng điểm */}
        <SpecialtiesSection />

        {/* Cẩm nang Bài tập PHCN tại nhà */}
        <ExercisesSection />

        {/* Đội ngũ Bác sĩ & KTV */}
        <DoctorsSection />

        {/* Quy trình Lượng giá & Trị liệu 4 bước */}
        <RehabProcessSection />

        {/* Form Đặt lịch khám trực tuyến */}
        <BookingSection />
      </main>

      {/* 3. Footer */}
      <Footer />
    </div>
  );
}
