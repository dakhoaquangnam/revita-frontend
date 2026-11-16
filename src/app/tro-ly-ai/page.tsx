"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  Bot,
  User,
  Send,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Info,
  Clock,
  Stethoscope,
  HeartHandshake,
  MapPin,
  Phone,
} from "lucide-react";
import { chatbotService } from "@/services/chatbot.service";
import { TsLogo } from "@/components/ui/ts-logo";

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  suggestBooking?: boolean;
}

export default function TroLyAiPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Xin chào! Tôi là Bác sĩ Trợ lý AI chuyên khoa Phục hồi chức năng & Vật lý trị liệu của Phòng khám Bác sĩ Thanh Sang.\n\nTôi có thể hỗ trợ bạn:\n• Phân tích triệu chứng đau nhức cơ xương khớp, cột sống, đau thần kinh tọa.\n• Hướng dẫn bài tập phục hồi chức năng sau tai biến, sau mổ dây chằng ACL hoặc gãy xương.\n• Gợi ý phương pháp trị liệu và chế độ vận động tại nhà phù hợp.\n\nHãy chia sẻ tình trạng hiện tại của bạn hoặc người nhà!",
      time: "Vừa xong",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTopics, setShowTopics] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages, loading, showTopics]);

  const quickTopics = [
    "Tôi bị đau lưng lan xuống chân trái, có phải thoát vị?",
    "Người nhà bị tai biến liệt nửa người 2 tháng nay, tập bài nào?",
    "Sau mổ dây chằng chéo trước ACL tuần thứ 3 cần chú ý gì?",
    "Địa chỉ và chi phí khám tại Bác sĩ Thanh Sang?",
  ];

  const handleSend = async (customText?: string) => {
    const text = customText || input;
    if (!text.trim()) return;

    // Tự động ẩn danh sách câu hỏi gợi ý khi hỏi xong
    setShowTopics(false);

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: text.trim(),
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(scrollToBottom, 50);

    try {
      const res = await chatbotService.sendMessage({ message: text.trim() });
      if (res && res.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: "ai",
            text: res.response,
            time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            suggestBooking: true,
          },
        ]);
        setLoading(false);
        return;
      }
    } catch {
      // Local fallback with accurate clinical advice
      setTimeout(() => {
        let reply =
          "Cảm ơn bạn đã chia sẻ cụ thể. Tình trạng vận động này cần được kiểm tra tầm vận động khớp và lượng giá chức năng để có phác đồ điều trị an toàn. Bác sĩ Thanh Sang khuyên bạn tránh mang vác nặng, xoay vặn đột ngột và nên duy trì các động tác kéo giãn cơ nhẹ nhàng.";
        const q = text.toLowerCase();
        if (q.includes("lưng") || q.includes("thoát vị")) {
          reply =
            "Triệu chứng đau thắt lưng lan xuống chân thường gợi ý chèn ép rễ thần kinh. Tại nhà, bạn có thể áp dụng tư thế nằm sấp thư giãn nếu không làm đau lan xa hơn. Tuyệt đối không cúi gập lưng bưng đồ nặng. Hãy đến phòng khám Bác sĩ Thanh Sang để đo độ co cứng cơ và áp dụng liệu trình kéo giãn giảm áp chuyên sâu.";
        } else if (q.includes("tai biến") || q.includes("liệt") || q.includes("đột quỵ")) {
          reply =
            "Giai đoạn 3-6 tháng đầu sau tai biến là 'thời gian vàng' để phục hồi tái tạo đường dẫn truyền thần kinh. Người nhà cần hỗ trợ tập ức chế mẫu co cứng gấp chi trên và duỗi chi dưới, tập bài bắc cầu nâng mông tại giường. Lưu ý không kéo mạnh tay bên liệt khi đỡ người bệnh dậy để bảo vệ khớp vai khỏi bị bán trật.";
        } else if (q.includes("dây chằng") || q.includes("acl") || q.includes("gối")) {
          reply =
            "Ở tuần thứ 3 sau mổ tái tạo dây chằng chéo trước, mục tiêu quan trọng là đạt duỗi thẳng gối 0 độ và tập gập dần đến 90 độ, đồng thời gồng cơ tĩnh tứ đầu đùi đều đặn mỗi ngày. Khi đi lại vẫn cần khóa nẹp gối theo chỉ định để bảo vệ mảnh ghép dây chằng.";
        } else if (q.includes("địa chỉ") || q.includes("chi phí") || q.includes("ở đâu")) {
          reply =
            "Phòng khám Phục hồi chức năng Bác sĩ Thanh Sang tọa lạc tại: 193 Quang Trung, Đại Lộc, Đà Nẵng. Hotline tư vấn & đặt lịch: 0369.117.117. Giờ làm việc từ 07:30 đến 19:30 hàng ngày. Khám lượng giá ban đầu và các buổi tập trị liệu 1 kèm 1 có mức phí công khai, rõ ràng.";
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: "ai",
            text: reply,
            time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            suggestBooking: true,
          },
        ]);
        setLoading(false);
      }, 600);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fffefc] text-[#222222] font-sans">
      <Navbar />

      <main className="flex-1 py-6 md:py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col h-[780px] max-h-[84vh]">
          {/* Top Clinical Header Banner: Botanical Greenhouse */}
          <div className="bg-[#e1f4df] rounded-[14px] p-4 sm:p-5 border border-[#efeeeb] mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-[14px] bg-[#0f3e17] text-[#fffefc] flex items-center justify-center shrink-0">
                <Stethoscope className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg sm:text-xl font-display-serif-medium text-[#0c2f10] whitespace-nowrap">
                    Hỏi đáp
                  </h1>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-[#0f3e17] text-[#e1f4df] px-2.5 py-0.5 rounded-full border border-transparent shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e1f4df] animate-ping" />
                    <span className="animate-pulse">Trực tuyến</span>
                  </span>
                </div>
                <p className="text-xs text-[#222222]/80 mt-0.5">
                  Tư vấn triệu chứng vận động, bài tập y khoa tại nhà • 193 Quang Trung, Đại Lộc, Đà Nẵng
                </p>
              </div>
            </div>

            <Link
              href="/dat-lich"
              className="hidden sm:inline-flex items-center gap-1.5 btn-forest text-xs py-2.5 px-4"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Đặt khám trực tiếp</span>
            </Link>
          </div>

          {/* Chat Container */}
          <div className="flex-1 bg-[#fffefc] rounded-[14px] border border-[#efeeeb] flex flex-col overflow-hidden">
            {/* Medical Disclaimer Banner */}
            <div className="bg-[#cfe7d3]/40 border-b border-[#efeeeb] px-4 py-2.5 flex items-center gap-2.5 text-xs text-[#0f3e17]">
              <ShieldCheck className="w-4 h-4 text-[#0f3e17] shrink-0" />
              <span>
                <strong>Khuyến cáo y khoa:</strong> Thông tin AI mang tính hướng dẫn tham khảo. Với chấn thương cấp tính, mất cảm giác hoặc khó thở, vui lòng gọi <strong>0369.117.117</strong> hoặc đến cơ sở y tế gần nhất.
              </span>
            </div>

            {/* Message Stream: Ẩn cuộn hoàn toàn bằng no-scrollbar, cuộn trơn tru */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4 bg-[#fffefc] scroll-smooth">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.sender === "ai" && (
                    <div className="w-8 h-8 rounded-[14px] bg-[#e1f4df] text-[#0f3e17] border border-[#efeeeb] flex items-center justify-center shrink-0 mt-0.5">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-[14px] p-4 text-sm leading-relaxed ${
                      m.sender === "user"
                        ? "bg-[#0f3e17] text-[#fffefc] rounded-tr-[4px]"
                        : "bg-[#e1f4df]/40 text-[#222222] border border-[#efeeeb] rounded-tl-[4px]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <span
                      className={`block text-[11px] mt-2 text-right ${
                        m.sender === "user" ? "text-[#b1dbb8]" : "text-[#0f3e17]/70"
                      }`}
                    >
                      {m.time}
                    </span>

                    {m.suggestBooking && (
                      <div className="mt-3 pt-3 border-t border-[#efeeeb] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <span className="text-xs text-[#0f3e17] font-medium">
                          Cần Bác sĩ Thanh Sang khám & đo góc ROM trực tiếp?
                        </span>
                        <Link
                          href="/dat-lich"
                          className="inline-flex items-center justify-center gap-1.5 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-xs px-3.5 py-1.5 rounded-[14px] transition-colors"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Đặt hẹn khám ngay</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {m.sender === "user" && (
                    <div className="w-8 h-8 rounded-[14px] bg-[#efeeeb] text-[#0f3e17] flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {/* Danh sách câu hỏi gợi ý thường gặp - Sắp xếp theo danh sách, tự động biến mất khi hỏi xong */}
              {showTopics && messages.filter((m) => m.sender === "user").length === 0 && (
                <div className="pl-11 pr-2 pt-1 space-y-2 animate-in fade-in duration-200">
                  <p className="eyebrow text-[#0f3e17]">
                    Gợi ý câu hỏi thường gặp:
                  </p>
                  <div className="space-y-2">
                    {quickTopics.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleSend(item)}
                        className="w-full text-left text-xs sm:text-[13px] text-[#0f3e17] bg-[#fffefc] hover:bg-[#e1f4df] border border-[#efeeeb] p-3 rounded-[14px] transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <span className="line-clamp-2 leading-relaxed font-medium">{item}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#0f3e17]/50 group-hover:text-[#0f3e17] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex gap-2 items-center text-xs text-[#0f3e17] pl-11">
                  <span className="w-2 h-2 rounded-full bg-[#0f3e17] animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-[#0f3e17] animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-[#0f3e17] animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[#0f3e17] font-medium">Bác sĩ AI đang phân tích dữ liệu y khoa...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 sm:p-4 bg-[#fffefc] border-t border-[#efeeeb] flex items-center gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Mô tả triệu chứng hoặc hỏi về bài tập phục hồi chức năng..."
                className="flex-1 px-4 py-3 text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[14px] text-[#222222] placeholder:text-[#222222]/40 focus:outline-none focus:border-[#0f3e17] focus:ring-1 focus:ring-[#0f3e17]"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="btn-forest px-5 py-3 text-sm disabled:opacity-40 transition-colors inline-flex items-center gap-2 shrink-0"
              >
                <span>Gửi</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
