"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Tv,
  MapPin,
  Clock,
  Bell,
  Heart,
} from "lucide-react";
import { useQueueEvents } from "@/hooks/use-queue-events";
import { ttsService } from "@/services/tts.service";
import {
  receptionistService,
  CounterItem,
  QueuePatient,
  QueueSnapshot,
} from "@/services/receptionist.service";
import { TsLogo } from "@/components/ui/ts-logo";

interface CalledPatient {
  queueNumber: string;
  patientName: string;
  counterCode: string;
  counterName: string;
  roomName: string;
  calledAt: string;
  isPriority?: boolean;
}

export default function TvDisplayPage() {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Bệnh nhân vừa được gọi (Spotlight) — null = chưa có lượt gọi nào hôm nay.
  const [spotlight, setSpotlight] = useState<CalledPatient | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // Hàng đợi thật từng quầy (đồng bộ từ backend, chỉ vé hôm nay).
  const [counters, setCounters] = useState<CounterItem[]>([]);
  const [counterQueues, setCounterQueues] = useState<Record<string, QueueSnapshot>>({});
  // Ngày làm việc hiện tại — đọc trong useEffect (Next 16 cấm new Date()
  // lúc render ở Client Component vì giá trị sẽ đóng cứng lúc prerender).
  const [todayLabel, setTodayLabel] = useState("");
  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString("vi-VN"));
  }, []);
  const isTodayTicket = (t: { assignedAt?: string }) =>
    !!todayLabel &&
    !!t.assignedAt &&
    new Date(t.assignedAt).toLocaleDateString("vi-VN") === todayLabel;

  const fetchCounterQueues = async () => {
    try {
      const list = await receptionistService.getCounters();
      setCounters(list);
      const snaps = await Promise.all(
        list.map(async (c) => {
          try {
            return [c.counterId, await receptionistService.getQueueSnapshot(c.counterId)] as const;
          } catch {
            return [c.counterId, null] as const;
          }
        }),
      );
      const next: Record<string, QueueSnapshot> = {};
      snaps.forEach(([id, snap]) => {
        if (snap) next[id] = snap;
      });
      setCounterQueues(next);
    } catch {
      // TV chỉ hiển thị: lỗi mạng thì giữ dữ liệu cũ, không báo giả.
    }
  };

  useEffect(() => {
    void fetchCounterQueues();
    const t = setInterval(() => {
      void fetchCounterQueues();
    }, 15000);
    return () => clearInterval(t);
  }, []);

  // Cập nhật đồng hồ số
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hàm phát âm thanh giọng nói tiếng Việt bằng VieNeu TTS (hoặc fallback trình duyệt)
  const speakVoice = (text: string) => {
    ttsService.speak(text);
  };

  // Kích hoạt chuông và phát thanh gọi số
  const triggerNewCall = (newCall: CalledPatient) => {
    setSpotlight(newCall);
    setIsFlashing(true);

    setTimeout(() => {
      setIsFlashing(false);
    }, 6000);

    if (soundEnabled) {
      speakVoice(
        `Xin mời bệnh nhân ${newCall.patientName}, số thứ tự ${newCall.queueNumber}, đến ${newCall.counterName}!`
      );
    }
    // Đồng bộ lại hàng đợi thật sau mỗi lượt gọi.
    void fetchCounterQueues();
  };

  // Lắng nghe sự kiện gọi bệnh nhân từ Buồng khám Bác sĩ / Quầy tiếp đón (BroadcastChannel & localStorage)
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("revita_tv_channel");
      channel.onmessage = (event) => {
        if (event.data?.type === "CALL_PATIENT" && event.data?.data) {
          triggerNewCall(event.data.data);
        }
      };
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "revita_tv_latest_call" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          triggerNewCall(data);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Lắng nghe WebSocket thời gian thực
  const { latestCalledTicket, isConnected } = useQueueEvents();

  useEffect(() => {
    if (latestCalledTicket) {
      const qNum = String(latestCalledTicket.ticketNumber || "A-001");
      const pName = (latestCalledTicket.patientName || "BỆNH NHÂN").toUpperCase();
      const cName = latestCalledTicket.counterNumber
        ? `Quầy Tiếp Nhận ${latestCalledTicket.counterNumber}`
        : latestCalledTicket.roomName || "Quầy Tiếp Nhận 1";

      triggerNewCall({
        queueNumber: qNum,
        patientName: pName,
        counterCode: latestCalledTicket.counterId || "CTR",
        counterName: cName,
        roomName: latestCalledTicket.roomName || "Sảnh Chính - Tầng 1",
        calledAt: latestCalledTicket.calledAt
          ? new Date(latestCalledTicket.calledAt).toLocaleTimeString("vi-VN")
          : new Date().toLocaleTimeString("vi-VN"),
        isPriority: false,
      });
    }
  }, [latestCalledTicket]);

  // TV mở sau khi đã gọi (hoặc tải lại trang): chưa có sự kiện WS nào thì
  // lấy bệnh nhân đang phục vụ hiện tại làm spotlight — chỉ hiển thị, không
  // chuông, không đọc loa.
  useEffect(() => {
    if (spotlight) return;
    let best: { t: QueuePatient; c: CounterItem } | null = null;
    for (const c of counters) {
      const cur = counterQueues[c.counterId]?.current;
      if (cur && cur.status === "SERVING" && isTodayTicket(cur)) {
        if (!best || cur.assignedAt > best.t.assignedAt) {
          best = { t: cur, c };
        }
      }
    }
    if (best) {
      setSpotlight({
        queueNumber: best.t.queueNumber,
        patientName: best.t.patientName.toUpperCase(),
        counterCode: best.t.counterCode || best.c.counterCode,
        counterName: best.t.counterName || best.c.counterName,
        roomName: "Sảnh Chính - Tầng 1",
        calledAt: new Date(best.t.assignedAt).toLocaleTimeString("vi-VN"),
        isPriority: false,
      });
    }
  }, [counterQueues, counters, spotlight]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fffefc] text-[#222222] flex flex-col justify-between select-none relative font-sans">
      {/* TOP HEADER: Branding & Sync Indicator & Controls */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-[#efeeeb] bg-[#fffefc] z-20">
        <div className="flex items-center gap-4">
          <TsLogo size="lg" showText={false} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-[#0f3e17]">
                PHÒNG KHÁM PHỤC HỒI CHỨC NĂNG BÁC SĨ THANH SANG
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] bg-[#e1f4df] text-[#0f3e17] border border-[#cfe7d3] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#0f3e17]" />
                {isConnected ? "WEBSOCKET LIVE" : "ĐANG KẾT NỐI"}
              </span>
            </div>
            <p className="text-xs text-[#222222]/60 font-semibold tracking-wider uppercase mt-0.5">
              193 Quang Trung, Đại Lộc, Đà Nẵng • Hotline: 0369.117.117
            </p>
          </div>
        </div>

        {/* Right Header: Clock & Controls */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-black text-[#0f3e17] font-mono tracking-wider">
              {currentTime || "08:30:00"}
            </div>
            <div className="text-xs text-[#222222]/60 capitalize font-medium">
              {currentDate || "Thứ năm, 12/11/2026"}
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) {
                speakVoice("Hệ thống phát thanh gọi số phòng khám Bác sĩ Thanh Sang đã sẵn sàng.");
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] border text-xs font-semibold transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-[#e1f4df] border-[#cfe7d3] text-[#0f3e17]"
                : "bg-[#fffefc] border-[#efeeeb] text-[#222222]/70 hover:bg-[#efeeeb]/40"
            }`}
            title="Bật âm thanh loa phát thanh tiếng Việt"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#0f3e17]" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{soundEnabled ? "LOA BẬT" : "BẬT LOA TV"}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-[14px] bg-[#fffefc] hover:bg-[#e1f4df]/40 border border-[#efeeeb] text-[#0f3e17] transition-colors"
            title="Toàn màn hình TV 16:9"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MAIN SCREEN (16:9 TV LAYOUT) */}
      <main className="flex-1 p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch z-10">
        {/* ===================== LEFT SPOTLIGHT: LƯỢT GỌI NỔI BẬT (7 COLS) ===================== */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div
            className={`h-full rounded-[14px] p-8 sm:p-10 flex flex-col justify-between transition-colors border ${
              isFlashing
                ? "bg-[#b1dbb8]/50 border-[#0f3e17]"
                : "bg-[#e1f4df] border-[#cfe7d3]"
            }`}
          >
            {/* Top Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-[6px] text-xs font-bold uppercase tracking-wider ${
                    isFlashing
                      ? "bg-[#0f3e17] text-[#fffefc]"
                      : "bg-[#0f3e17] text-[#fffefc]"
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>{isFlashing ? "ĐANG PHÁT LOA GỌI SỐ" : spotlight ? "SỐ VỪA ĐƯỢC GỌI" : "CHỜ LƯỢT GỌI"}</span>
                </span>

                {spotlight?.isPriority && (
                  <span className="px-2.5 py-1 rounded-[6px] bg-[#fffefc] border border-[#cfe7d3] text-[#0f3e17] text-xs font-bold">
                    ƯU TIÊN Y TẾ
                  </span>
                )}
              </div>

              <div className="text-xs text-[#222222]/70 flex items-center gap-1 font-mono">
                <Clock className="w-4 h-4 text-[#0f3e17]" />
                <span>Thời gian: {spotlight?.calledAt ?? "--:--:--"}</span>
              </div>
            </div>

            {/* Giant Number Display */}
            <div className="my-8 text-center space-y-4">
              <div className="text-sm sm:text-base font-bold text-[#0f3e17]/80 uppercase tracking-widest">
                XIN MỜI BỆNH NHÂN CÓ SỐ THỨ TỰ
              </div>

              <div
                className={`text-6xl sm:text-8xl lg:text-9xl font-black font-mono tracking-widest leading-none text-[#0f3e17] transition-transform ${
                  isFlashing ? "scale-105" : ""
                }`}
              >
                {spotlight?.queueNumber ?? "—"}
              </div>

              <div className="text-2xl sm:text-4xl font-extrabold text-[#0f3e17] tracking-wide uppercase pt-2">
                {spotlight?.patientName ?? "Chưa có lượt gọi nào"}
              </div>
            </div>

            {/* Destination Room / Counter Box */}
            <div className="p-6 rounded-[14px] bg-[#fffefc] border border-[#cfe7d3] flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[14px] bg-[#e1f4df] border border-[#cfe7d3] flex items-center justify-center text-[#0f3e17] flex-shrink-0">
                  <MapPin className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#222222]/60 uppercase tracking-wider">
                    VUI LÒNG ĐẾN
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#0f3e17]">
                    {spotlight?.counterName ?? "Màn hình sẽ tự cập nhật khi lễ tân gọi số"}
                  </div>
                  <div className="text-xs text-[#0f3e17] font-medium">
                    {spotlight?.roomName ?? ""}
                  </div>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-xs text-[#222222]/60">Trạng thái</span>
                <div className="text-sm font-bold text-[#0f3e17] flex items-center gap-1.5 justify-end">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0f3e17]" />
                  Mời vào phòng
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== RIGHT OVERVIEW: BẢNG TỔNG HỢP CÁC BUỒNG (5 COLS) ===================== */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="bg-[#fffefc] border border-[#efeeeb] rounded-[14px] p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#efeeeb]">
                <div className="flex items-center gap-2">
                  <Tv className="w-5 h-5 text-[#0f3e17]" />
                  <h3 className="text-sm font-black text-[#0f3e17] uppercase tracking-wider">
                    HÀNG ĐỢI CÁC QUẦY TIẾP NHẬN
                  </h3>
                </div>
                <span className="text-xs text-[#222222]/60">Hôm nay • tự cập nhật 15 giây</span>
              </div>

              {/* Hàng đợi thật từng quầy (đồng bộ từ lễ tân/kiosk) */}
              <div className="space-y-3 mt-4">
                {counters.length === 0 && (
                  <div className="p-4 rounded-[14px] bg-[#e1f4df]/20 text-center text-xs text-[#222222]/60">
                    Đang tải hàng đợi các quầy...
                  </div>
                )}
                {counters.map((c) => {
                  const snap = counterQueues[c.counterId];
                  const current =
                    snap?.current && isTodayTicket(snap.current) ? snap.current : null;
                  const waiting = (snap?.queue ?? [])
                    .filter((t) => isTodayTicket(t))
                    .slice(0, 5);
                  return (
                    <div
                      key={c.counterId}
                      className="p-3.5 rounded-[14px] bg-[#fffefc] border border-[#efeeeb] hover:bg-[#e1f4df]/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-[#0f3e17] text-xs sm:text-sm">
                          {c.counterCode} - {c.counterName}
                        </div>
                        <span className="text-[11px] text-[#222222]/60">
                          {waiting.length} đang đợi
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-[#222222]/60 font-medium">Đang phục vụ:</div>
                        <div className="text-right">
                          <div className="text-xl font-black font-mono text-[#0f3e17]">
                            {current?.queueNumber ?? "—"}
                          </div>
                          <div className="text-[10px] text-[#222222]/60 truncate max-w-[180px]">
                            {current?.patientName ?? "Quầy đang trống"}
                          </div>
                        </div>
                      </div>

                      {waiting.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[#efeeeb] space-y-1">
                          {waiting.map((t, i) => (
                            <div
                              key={t.ticketId || i}
                              className="flex items-center justify-between text-[11px]"
                            >
                              <span className="font-mono font-bold text-[#0f3e17]">
                                {t.queueNumber}
                              </span>
                              <span className="text-[#222222]/70 truncate max-w-[180px]">
                                {t.patientName}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Rehab Reminder */}
            <div className="mt-4 p-4 rounded-[14px] bg-[#e1f4df]/40 border border-[#cfe7d3] text-xs space-y-1.5 text-[#0f3e17]">
              <div className="font-bold flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-[#0f3e17]" />
                <span>Lưu ý Phục hồi chức năng:</span>
              </div>
              <p className="text-[11px] text-[#222222]/80 leading-relaxed">
                Người bệnh sau tai biến hoặc phẫu thuật dây chằng gối cần có người nhà đi cùng hỗ trợ khi di chuyển lên phòng tập tầng 2.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#efeeeb] bg-[#fffefc] py-3.5 px-8 flex items-center justify-between gap-6 z-20">
        <div className="flex-1 flex items-center gap-3 overflow-hidden">
          <span className="px-2.5 py-1 rounded-[6px] bg-[#0f3e17] text-[#fffefc] text-xs font-semibold flex-shrink-0">
            THÔNG BÁO BÁC SĨ THANH SANG
          </span>
          <div className="text-xs text-[#222222]/80 whitespace-nowrap overflow-hidden text-ellipsis font-medium">
            Phòng khám chuyên khoa Phục hồi chức năng Bác sĩ Thanh Sang (193 Quang Trung, Đại Lộc, Đà Nẵng • Hotline: 0369.117.117) làm việc liên tục từ 07:30 đến 19:30 hàng ngày • Quý khách có thể tự bốc số ưu tiên tại Kiosk sảnh hoặc quét mã QR check-in trên điện thoại • Thanh toán viện phí không dùng tiền mặt qua VietQR thuận tiện.
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs text-[#222222]/60 font-medium flex-shrink-0">
          <Link href="/kiosk" className="hover:text-[#0f3e17] transition-colors">
            Cây Kiosk Bốc số
          </Link>
          <span>•</span>
          <Link href="/dashboard" className="hover:text-[#0f3e17] transition-colors">
            Bàn làm việc Bác sĩ / Lễ tân
          </Link>
          <span>•</span>
          <Link href="/" className="hover:text-[#0f3e17] transition-colors">
            Cổng Web
          </Link>
        </div>
      </footer>
    </div>
  );
}
