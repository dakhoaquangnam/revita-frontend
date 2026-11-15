"use client";

import { usePathname } from "next/navigation";
import { FloatingChatbot } from "./floating-chatbot";

// Kiosk và màn hình TV là màn hình công cộng, tự chạy — không hiện nút chat
// "Hỏi đáp" trên 2 màn hình này. Các trang khác vẫn hiện bình thường.
const HIDDEN_PREFIXES = ["/kiosk", "/tv-display"];

export function ConditionalChatbot() {
  const pathname = usePathname();
  if (
    HIDDEN_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    )
  ) {
    return null;
  }
  return <FloatingChatbot />;
}
