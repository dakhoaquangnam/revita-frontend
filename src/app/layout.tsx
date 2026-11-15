import type { Metadata } from "next";
import { Suspense } from "react";
import { Be_Vietnam_Pro } from "next/font/google";
import QueryProvider from "@/components/providers/query-provider";
import { ConditionalChatbot } from "@/components/chatbot/conditional-chatbot";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bác Sĩ Thanh Sang - Phòng Khám Chuyên Khoa Phục Hồi Chức Năng",
  description:
    "Phục hồi chức năng chuyên sâu sau tai biến, cơ xương khớp và chấn thương tại 193 Quang Trung, Đại Lộc, Đà Nẵng. Hotline 0369.117.117. Không gian lâm sàng thư thái chuẩn botanical greenhouse, cá nhân hóa liệu trình lượng giá FIM & đo ROM.",
  keywords: [
    "bác sĩ thanh sang",
    "phục hồi chức năng thanh sang",
    "phòng khám thanh sang đà nẵng",
    "phục hồi chức năng",
    "vật lý trị liệu",
    "hoạt động trị liệu",
    "thoát vị đĩa đệm",
    "tai biến mạch máu não",
    "đột quỵ",
    "bài tập trị liệu tại nhà",
  ],
  openGraph: {
    title: "Bác Sĩ Thanh Sang - Chuyên Khoa Phục Hồi Chức Năng & Vật Lý Trị Liệu",
    description:
      "Chăm sóc và phục hồi chức năng toàn diện với Bác sĩ Thanh Sang và đội ngũ kỹ thuật viên tận tâm tại 193 Quang Trung, Đại Lộc, Đà Nẵng.",
    type: "website",
    locale: "vi_VN",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fffefc] text-[#222222] font-sans">
        <QueryProvider>
          {children}
          {/* usePathname() cần Suspense để không chặn prerender trang tĩnh. */}
          <Suspense fallback={null}>
            <ConditionalChatbot />
          </Suspense>
        </QueryProvider>
      </body>
    </html>
  );
}
