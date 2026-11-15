"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Volume2,
  Key,
  ShieldCheck,
  ShieldAlert,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ttsService, VIENEU_VOICES, VIENEU_BASE, VIENEU_VOICE, VIENEU_MODEL } from "@/services/tts.service";

export default function VoiceConfigPage() {
  const { user } = useAuth();

  const [ttsApiKey, setTtsApiKey] = useState("");
  const [ttsVoice, setTtsVoice] = useState(VIENEU_VOICE);
  const [savedVoice, setSavedVoice] = useState(VIENEU_VOICE);
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [ttsSuccessMsg, setTtsSuccessMsg] = useState("");
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  // Load existing TTS settings from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const current = ttsService.getSettings();
      setTtsApiKey(current.apiKey || "");
      const initialVoice = current.voice || VIENEU_VOICE;
      setTtsVoice(initialVoice);
      setSavedVoice(initialVoice);
    }
  }, []);

  const handleSaveTtsSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const voiceToSave = ttsVoice || VIENEU_VOICE;
    ttsService.saveSettings({
      apiKey: ttsApiKey.trim(),
      voice: voiceToSave,
      model: VIENEU_MODEL,
      endpoint: `${VIENEU_BASE}/v1/audio/speech`,
      baseUrl: VIENEU_BASE,
    });
    setSavedVoice(voiceToSave);
    setTtsSuccessMsg(`Đã lưu & kích hoạt giọng đọc "${voiceToSave}" thành công!`);
    setTimeout(() => setTtsSuccessMsg(""), 4000);
  };

  const handleTestTtsVoice = async () => {
    setIsTestingVoice(true);
    if (ttsApiKey.trim()) {
      ttsService.saveSettings({
        apiKey: ttsApiKey.trim(),
        voice: ttsVoice || VIENEU_VOICE,
        model: VIENEU_MODEL,
        endpoint: `${VIENEU_BASE}/v1/audio/speech`,
        baseUrl: VIENEU_BASE,
      });
      setSavedVoice(ttsVoice || VIENEU_VOICE);
    }

    await ttsService.speak(
      "Phòng khám Chuyên khoa Phục hồi chức năng Bác sĩ Thanh Sang, địa chỉ 193 Quang Trung, Đại Lộc, Đà Nẵng, xin kính chào quý khách.",
      {
        onEnd: () => setIsTestingVoice(false),
        onError: () => setIsTestingVoice(false),
      }
    );
    setTimeout(() => setIsTestingVoice(false), 3000);
  };

  // RBAC: Chỉ Admin mới có quyền truy cập
  if (user && user.role !== "ADMIN") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#fffefc] border border-rose-200 rounded-[16px] p-6 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-rose-800">Quyền truy cập bị từ chối</h2>
            <p className="text-xs text-[#222222]/70 mt-1">
              Mục Cấu hình giọng đọc chỉ dành riêng cho tài khoản Quản trị viên (Admin).
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#0f3e17] text-[#fffefc] rounded-[10px] text-xs font-semibold hover:bg-[#0c2f10] transition-colors"
          >
            Quay lại Bàn làm việc
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#efeeeb]">
        <div>
          <div className="text-[11px] font-bold text-[#0f3e17] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0f3e17]" />
            <span>QUẢN TRỊ GIỌNG ĐỌC</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f3e17] tracking-tight">
            Cấu hình giọng đọc
          </h1>
          <p className="text-xs text-[#222222]/70 mt-1">
            Cài đặt API Key VieNeu TTS tự động phát loa hướng dẫn cho Kiosk tiếp đón và TV sảnh gọi số
          </p>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[16px] p-6 sm:p-8 shadow-xs space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#efeeeb] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#e1f4df] text-[#0f3e17] flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0f3e17] flex flex-wrap items-center gap-1.5">
                <span>VieNeu Cloud TTS</span>
                <span className="text-xs font-normal text-[#0f3e17]">
                  • {ttsApiKey.trim().length > 3 ? "Đã kích hoạt" : "Chưa nhập API Key (Đang dùng giọng trình duyệt)"}
                </span>
              </h2>
              <p className="text-xs text-[#222222]/70 mt-0.5">
                Chỉ cần nhập API Key vào là hệ thống tự động kết nối và đọc ngay
              </p>
            </div>
          </div>

          <div className="text-xs text-[#222222]/60 font-medium">
            Trạng thái:{" "}
            <strong className="text-[#0f3e17]">
              {ttsApiKey.trim().length > 3 ? "VieNeu AI Voice" : "Browser Speech API"}
            </strong>
          </div>
        </div>

        {/* Thông tin cấu hình Cloud - Không còn chữ trong ngoặc */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#e1f4df]/40 rounded-[14px] border border-[#cfe7d3] text-xs">
          <div>
            <span className="text-[#222222]/60 block text-[11px] font-medium">Máy chủ Cloud:</span>
            <strong
              className="text-[#0f3e17] font-mono text-[11px] truncate block mt-0.5"
              title={VIENEU_BASE}
            >
              8000-agq4avcnnsnmokkqxrqgd55qke.instabox.tech
            </strong>
          </div>
          <div>
            <span className="text-[#222222]/60 block text-[11px] font-medium">Giọng đọc:</span>
            <strong className="text-[#0f3e17] font-mono text-[11px] block mt-0.5">
              {savedVoice}
            </strong>
          </div>
          <div>
            <span className="text-[#222222]/60 block text-[11px] font-medium">Mô hình AI:</span>
            <strong className="text-[#0f3e17] font-mono text-[11px] block mt-0.5">
              vieneu-v3-nano
            </strong>
          </div>
        </div>

        {/* Form Cấu hình */}
        <form onSubmit={handleSaveTtsSettings} className="space-y-5">
          {ttsSuccessMsg && (
            <div className="p-3.5 rounded-[12px] bg-[#e1f4df] text-[#0f3e17] text-xs flex items-center gap-2 border border-[#cfe7d3]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{ttsSuccessMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#0f3e17] mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#0f3e17]" />
                Nhập VieNeu TTS API Key của bạn
              </span>
              <span className="text-[10px] font-normal text-[#222222]/60">
                Lưu trữ cục bộ an toàn trong trình duyệt Admin
              </span>
            </label>
            <div className="relative">
              <input
                type={showKeySecret ? "text" : "password"}
                value={ttsApiKey}
                onChange={(e) => setTtsApiKey(e.target.value)}
                placeholder="Dán mã API Key VieNeu TTS của bạn tại đây..."
                className="block w-full pl-3.5 pr-10 py-3 bg-[#fffefc] border border-[#efeeeb] rounded-[12px] text-xs text-[#222222] font-mono focus:outline-none focus:border-[#0f3e17] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKeySecret(!showKeySecret)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#222222]/40 hover:text-[#0f3e17]"
              >
                {showKeySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0f3e17] mb-1.5">
              Chọn giọng đọc AI
            </label>
            <select
              value={ttsVoice}
              onChange={(e) => setTtsVoice(e.target.value)}
              className="w-full sm:w-80 px-3.5 py-2.5 text-xs bg-[#fffefc] border border-[#efeeeb] rounded-[12px] focus:outline-none focus:border-[#0f3e17] appearance-none cursor-pointer"
            >
              {VIENEU_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Hộp xem trước câu chào */}
          <div className="p-4 rounded-[12px] bg-[#efeeeb]/40 border border-[#efeeeb] text-xs text-[#222222]/80">
            <span className="font-semibold text-[#0f3e17]">Câu thử nghiệm âm thanh mẫu:</span>
            <p className="italic mt-1.5 text-[11px] text-[#222222]/70 leading-relaxed">
              &quot;Phòng khám Chuyên khoa Phục hồi chức năng Bác sĩ Thanh Sang, địa chỉ 193 Quang Trung, Đại Lộc, Đà Nẵng, xin kính chào quý khách.&quot;
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#efeeeb]">
            <button
              type="button"
              onClick={handleTestTtsVoice}
              disabled={isTestingVoice}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#e1f4df] hover:bg-[#cfe7d3] text-[#0f3e17] text-xs font-semibold border border-[#cfe7d3] transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>{isTestingVoice ? "Đang phát âm thanh..." : "Nghe thử giọng"}</span>
            </button>

            <button
              type="submit"
              className="btn-forest text-xs py-2.5 px-6 rounded-[12px] inline-flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Lưu & Kích hoạt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
