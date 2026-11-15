"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Send,
  User,
  ShieldCheck,
  Calendar,
  Maximize2,
  ArrowRight,
  Stethoscope,
  Bot,
  MapPin,
  Phone,
} from "lucide-react";
import { chatbotService } from "@/services/chatbot.service";

interface MessageItem {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  suggestBooking?: boolean;
}

// Phản hồi y khoa chuyên sâu PHCN thông minh theo thông tin Phòng khám Bác sĩ Thanh Sang
function getLocalRehabAdvice(question: string): { reply: string; suggestBooking: boolean } {
  const q = question.toLowerCase();

  if (q.includes("tai biến") || q.includes("đột quỵ") || q.includes("liệt")) {
    return {
      reply:
        "Với người bệnh sau đột quỵ/tai biến, giai đoạn 3-6 tháng đầu là 'thời gian vàng' để phục hồi tính mềm dẻo của hệ thần kinh. Tại nhà, người nhà nên hỗ trợ tập kéo giãn ngón tay nhẹ nhàng, ức chế mẫu co cứng gấp và tập bài bắc cầu (Bridge) trên giường. Tuyệt đối không kéo giật tay bên liệt khi đỡ dậy. Bác sĩ Thanh Sang khuyến nghị người bệnh nên được lượng giá cơ lực định kỳ để điều chỉnh bài tập.",
      suggestBooking: true,
    };
  }

  if (q.includes("thoát vị") || q.includes("đau lưng") || q.includes("cột sống") || q.includes("thần kinh tọa")) {
    return {
      reply:
        "Đau lưng hoặc thoát vị đĩa đệm (L4-L5, L5-S1) thường do áp lực đĩa đệm chèn ép rễ thần kinh tọa. Tại nhà, bạn nên tập chuỗi bài tập McKenzie (ưỡn ngực nằm sấp) và bài tập Bird-Dog để gia cố khối cơ lõi bảo vệ cột sống. Tránh cúi gập lưng bê vật nặng hoặc xoay vặn người đột ngột. Nếu tê bì lan xuống bàn chân, bạn nên đến phòng khám Bác sĩ Thanh Sang để đo độ chèn ép và kéo giãn giảm áp.",
      suggestBooking: true,
    };
  }

  if (q.includes("dây chằng") || q.includes("gối") || q.includes("acl") || q.includes("mổ")) {
    return {
      reply:
        "Sau mổ tái tạo dây chằng chéo trước (ACL), mục tiêu hàng đầu tuần 2-6 là đạt duỗi thẳng gối 0 độ và gập gối 90 độ, đồng thời gồng cơ tĩnh tứ đầu đùi (Quad sets) đều đặn để chống teo cơ. Khi đi lại cần khóa nẹp gối đúng hướng dẫn và kết hợp di động xương bánh chè chống dính khớp.",
      suggestBooking: true,
    };
  }

  if (q.includes("cổ") || q.includes("vai gáy") || q.includes("văn phòng")) {
    return {
      reply:
        "Đau mỏi cổ vai gáy thường do co thắt cơ thang trên và tư thế đầu đưa ra trước. Động tác hữu hiệu là 'Thụt cằm' (Chin Tuck): ngồi thẳng lưng, dùng ngón tay ấn cằm thụt nhẹ về sau, giữ 5 giây rồi thả lỏng, lặp lại 10 lần mỗi ngày kết hợp nâng màn hình ngang tầm mắt.",
      suggestBooking: false,
    };
  }

  if (q.includes("giá") || q.includes("chi phí") || q.includes("tiền") || q.includes("bao nhiêu")) {
    return {
      reply:
        "Bảng giá dịch vụ tại Phòng khám Bác sĩ Thanh Sang luôn công khai minh bạch: Khám & Lượng giá FIM toàn diện là 200.000đ; Buổi tập Vật lý trị liệu 1 kèm 1 với Kỹ thuật viên từ 300.000đ - 350.000đ; Trị liệu sóng xung kích Shockwave là 350.000đ/vùng. Phòng khám có các gói liệu trình tiết kiệm.",
      suggestBooking: true,
    };
  }

  if (q.includes("giờ") || q.includes("địa chỉ") || q.includes("ở đâu") || q.includes("lịch")) {
    return {
      reply:
        "Phòng khám Phục hồi chức năng Bác sĩ Thanh Sang tọa lạc tại: 193 Quang Trung, Đại Lộc, Đà Nẵng. Hotline tư vấn: 0369.117.117. Giờ làm việc: Thứ 2 đến Thứ 7 từ 7h30 - 19h30; Chủ nhật từ 8h00 - 12h00. Bạn có thể đặt hẹn trước để vào khám đúng giờ.",
      suggestBooking: true,
    };
  }

  return {
    reply:
      "Cảm ơn bạn đã chia sẻ. Tình trạng vận động của bạn cần được kiểm tra tầm vận động khớp (ROM) và cơ lực cụ thể để đưa ra phác đồ chính xác. Bạn có thể mô tả kỹ hơn vùng đau hoặc đăng ký buổi khám lượng giá cùng Bác sĩ Thanh Sang.",
    suggestBooking: true,
  };
}

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "msg-welcome",
      sender: "ai",
      text: "Xin chào! Tôi là Trợ lý AI Phục hồi chức năng • Phòng khám Bác sĩ Thanh Sang (193 Quang Trung, Đại Lộc, Đà Nẵng). Bạn hoặc người thân đang gặp khó khăn gì về vận động hay đau nhức? Hãy nhắn cho tôi nhé!",
      time: "Vừa xong",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [messages, isTyping, isOpen, showPrompts]);

  const quickPrompts = [
    "Thoát vị đĩa đệm lưng tập bài gì?",
    "Người nhà sau tai biến 1 tháng tập gì?",
    "Chi phí khám và tập là bao nhiêu?",
    "Địa chỉ và giờ mở cửa phòng khám?",
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    // Tự động ẩn danh sách câu hỏi gợi ý khi đã hỏi
    setShowPrompts(false);

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: text.trim(),
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsTyping(true);

    // Kích hoạt cuộn xuống đáy vô cực
    setTimeout(scrollToBottom, 50);

    try {
      const response = await chatbotService.sendMessage({ message: text.trim() });
      if (response && response.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: "ai",
            text: response.response,
            time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            suggestBooking: true,
          },
        ]);
        setIsTyping(false);
        return;
      }
    } catch {
      // Fallback to local clinical expert knowledge base
      setTimeout(() => {
        const { reply, suggestBooking } = getLocalRehabAdvice(text);
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: "ai",
            text: reply,
            time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            suggestBooking,
          },
        ]);
        setIsTyping(false);
      }, 500);
    }
  };

  return (
    <>
      {/* 1. Floating Action Button: Phong cách Botanical 14px radius, không bọc viên thuốc */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-sm px-4 py-3 rounded-[14px] border border-[#0c2f10] transition-all hover:scale-102 active:scale-98 group"
          style={{
            boxShadow: "0 4px 16px rgba(15, 62, 23, 0.2)",
          }}
          aria-label="Mở Trợ lý AI Bác sĩ Thanh Sang"
        >
          <div className="relative">
            <Stethoscope className="w-5 h-5 text-[#b1dbb8]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#b1dbb8] rounded-full"></span>
          </div>
          <span className="hidden sm:inline font-sans font-medium">Hỏi đáp</span>
        </button>
      )}

      {/* 2. Floating Chat Modal: Ease Health Botanical Canvas */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[420px] h-[580px] max-h-[85vh] bg-[#fffefc] rounded-[16px] border border-[#efeeeb] flex flex-col overflow-hidden animate-in fade-in duration-150 font-sans shadow-xl">
          {/* Header */}
          <div className="bg-[#0f3e17] text-[#fffefc] p-4 flex items-center justify-between border-b border-[#0c2f10]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-[#e1f4df] text-[#0f3e17] flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-tight text-[#fffefc] whitespace-nowrap">
                    Trợ lý Y khoa Bác sĩ
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold bg-[#0c2f10] text-[#e1f4df] px-2 py-0.5 rounded-[6px] border border-[#b1dbb8]/30 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e1f4df] animate-ping" />
                    <span className="animate-pulse">Trực tuyến</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#b1dbb8]">
                  193 Quang Trung, Đại Lộc, Đà Nẵng • 0369.117.117
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/tro-ly-ai"
                className="p-1.5 rounded-[6px] text-[#b1dbb8] hover:text-[#fffefc] hover:bg-[#0c2f10] transition-colors"
                title="Mở toàn màn hình"
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-[6px] text-[#b1dbb8] hover:text-[#fffefc] hover:bg-[#0c2f10] transition-colors"
                title="Đóng cửa sổ chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Medical Disclaimer Banner */}
          <div className="bg-[#e1f4df]/60 px-3.5 py-2 border-b border-[#cfe7d3] flex items-center gap-2 text-[11px] text-[#0f3e17] shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0f3e17] shrink-0" />
            <span>Thông tin tham khảo y khoa. Cần khám trực tiếp trước khi bắt đầu liệu trình.</span>
          </div>

          {/* Messages Feed: Ẩn cuộn hoàn toàn bằng no-scrollbar, cuộn trơn tru */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3.5 bg-[#fffefc] scroll-smooth">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "ai" && (
                  <div className="w-7 h-7 rounded-[8px] bg-[#e1f4df] text-[#0f3e17] flex items-center justify-center shrink-0 mt-0.5 border border-[#cfe7d3]">
                    <Stethoscope className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-[12px] px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#0f3e17] text-[#fffefc] rounded-tr-[2px]"
                      : "bg-[#e1f4df]/40 text-[#222222] border border-[#cfe7d3]/80 rounded-tl-[2px]"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span
                    className={`block text-[10px] mt-1 text-right ${
                      msg.sender === "user" ? "text-[#b1dbb8]" : "text-[#0f3e17]/60"
                    }`}
                  >
                    {msg.time}
                  </span>

                  {msg.suggestBooking && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#0f3e17]/10 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#0f3e17] font-medium hidden sm:inline">
                        Khám trực tiếp cùng BS Thanh Sang:
                      </span>
                      <Link
                        href="/dat-lich"
                        className="inline-flex items-center gap-1 bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] font-semibold text-[11px] px-2.5 py-1 rounded-[6px] transition-colors"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Đặt lịch khám</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>

                {msg.sender === "user" && (
                  <div className="w-7 h-7 rounded-[8px] bg-[#efeeeb] text-[#0f3e17] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Danh sách câu hỏi gợi ý thường gặp - Sắp xếp theo danh sách, tự động biến mất khi hỏi */}
            {showPrompts && messages.filter((m) => m.sender === "user").length === 0 && (
              <div className="pl-9 pr-1 pt-1 space-y-2 animate-in fade-in duration-200">
                <p className="text-[11px] font-semibold text-[#0f3e17] uppercase tracking-wider">
                  Gợi ý câu hỏi thường gặp:
                </p>
                <div className="space-y-1.5">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-left text-xs text-[#0f3e17] bg-[#fffefc] hover:bg-[#e1f4df] border border-[#cfe7d3] p-2.5 rounded-[10px] transition-all flex items-center justify-between group shadow-xs hover:border-[#0f3e17]/40 cursor-pointer"
                    >
                      <span className="line-clamp-2 leading-relaxed">{prompt}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0f3e17]/50 group-hover:text-[#0f3e17] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isTyping && (
              <div className="flex gap-2 items-center text-xs text-[#0f3e17] pl-9">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f3e17] animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f3e17] animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f3e17] animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[11px] text-[#0f3e17] font-medium">Bác sĩ AI đang trả lời...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#fffefc] border-t border-[#efeeeb] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Nhập câu hỏi hoặc triệu chứng..."
              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-[#fffefc] border border-[#efeeeb] rounded-[8px] text-[#222222] placeholder:text-[#222222]/40 focus:outline-none focus:border-[#0f3e17]"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="p-2.5 rounded-[8px] bg-[#0f3e17] hover:bg-[#0c2f10] text-[#fffefc] disabled:opacity-40 transition-colors shrink-0"
              aria-label="Gửi tin nhắn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
