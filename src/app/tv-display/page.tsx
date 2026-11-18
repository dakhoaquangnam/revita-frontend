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

  // TV 18/11 — 3 thẻ "Đang phục vụ": mỗi quầy 1 thẻ, chỉ hiện tên bệnh nhân
  // to sau chữ "Đang phục vụ", không hiện số CTR hay tên quầy trong thẻ.
  // Mỗi thẻ tự xoay vòng danh sách quầy mình (người đang phục vụ rồi tới
  // người đang đợi) mỗi 5 giây.
  const [rotationIndex, setRotationIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setRotationIndex((i) => i + 1), 5000);
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
  const { latestCalledTicket, latestRoomCall, isConnected } = useQueueEvents();

  useEffect(() => {
    if (latestCalledTicket) {
      const qNum = String(latestCalledTicket.ticketNumber || "A-001");
      const pName = (latestCalledTicket.patientName || "BỆNH NHÂN").toUpperCase();
      const cName =
        latestCalledTicket.counterName ||
        latestCalledTicket.roomName ||
        "Quầy Tiếp Nhận 1";

      triggerNewCall({
        queueNumber: qNum,
        patientName: pName,
        counterCode: latestCalledTicket.counterCode || "CTR",
        counterName: cName,
        roomName: latestCalledTicket.roomName || "Sảnh Chính - Tầng 1",
        calledAt: latestCalledTicket.calledAt
          ? new Date(latestCalledTicket.calledAt).toLocaleTimeString("vi-VN")
          : new Date().toLocaleTimeString("vi-VN"),
        isPriority: false,
      });
    }
  }, [latestCalledTicket]);

  // GĐ2 §4.4.4 — lệnh gọi vào phòng: spotlight hiện tên phòng thay vì tên
  // quầy (counterName = roomName), kèm mã phiếu/lịch hẹn làm số hiệu.
  useEffect(() => {
    if (!latestRoomCall) return;
    triggerNewCall({
      queueNumber: String(latestRoomCall.ticketNumber || "—"),
      patientName: (latestRoomCall.patientName || "BỆNH NHÂN").toUpperCase(),
      counterCode: latestRoomCall.counterCode || "PHÒNG",
      counterName:
        latestRoomCall.roomName || latestRoomCall.counterName || "Phòng khám",
      roomName: latestRoomCall.roomName || "Phòng khám",
      calledAt: latestRoomCall.calledAt
        ? new Date(latestRoomCall.calledAt).toLocaleTimeString("vi-VN")
        : new Date().toLocaleTimeString("vi-VN"),
      isPriority: false,
    });
  }, [latestRoomCall]);

  // Đồng bộ spotlight theo bệnh nhân đang phục vụ thật (poll 15 giây).
  // CHỈ SEED khi spotlight đang trống: TV mở sau khi đã gọi (hoặc tải lại
  // trang) lấy người đang phục vụ làm spotlight thay vì "Chưa có lượt gọi nào".
  // Sự kiện gọi trực tiếp qua WebSocket là nguồn thật cho spotlight; poll
  // KHÔNG ghi đè spotlight nữa — trước đây poll kéo về người có assignedAt
  // mới nhất (CTR002-011) và át mất sự kiện vừa gọi (CTR003-001).
  // Chọn theo lần gọi gần nhất: preparingAt (lúc gọi, được làm mới mỗi lần
  // gọi lại), không phải assignedAt (lúc tạo vé) — nếu không TV tải lại sẽ
  // hiện vé cũ gọi từ 22:28 thay vì vé vừa gọi lại lúc 23:47.
  const callTime = (t: QueuePatient) => t.preparingAt || t.assignedAt;
  useEffect(() => {
    if (spotlight) return;
    let best: { t: QueuePatient; c: CounterItem } | null = null;
    for (const c of counters) {
      const cur = counterQueues[c.counterId]?.current;
      if (cur && cur.status === "SERVING" && isTodayTicket(cur)) {
        if (!best || callTime(cur) > callTime(best.t)) {
          best = { t: cur, c };
        }
      }
    }
    if (!best) return;
    setSpotlight({
      queueNumber: best.t.queueNumber,
      patientName: best.t.patientName.toUpperCase(),
      counterCode: best.t.counterCode || best.c.counterCode,
      counterName: best.t.counterName || best.c.counterName,
      roomName: "Sảnh Chính - Tầng 1",
      calledAt: new Date(callTime(best.t)).toLocaleTimeString("vi-VN"),
      isPriority: false,
    });
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
      {/* TOP HEADER: Branding & Sync Indicator & Controls — DESIGN.md:
          serif 300 cho tên phòng khám, eyebrow 11px/600 cho nhãn phân mục,
          badge pill 999px, không viền màu, chỉ hairline Border Mist. */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-[#efeeeb] bg-[#fffefc] z-20">
        <div className="flex items-center gap-4">
          <TsLogo size="lg" showText={false} />
          <div>
            <div className="eyebrow text-[#0f3e17]">Phòng chờ • Phục hồi chức năng</div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="font-display-serif text-3xl lg:text-[40px] leading-[1.1] tracking-[-0.01em] text-[#0f3e17]">
                Phòng khám Phục hồi chức năng Bác sĩ Thanh Sang
              </h1>
              <span className="badge-pill badge-pill-cream flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#0f3e17]" />
                {isConnected ? "WEBSOCKET LIVE" : "ĐANG KẾT NỐI"}
              </span>
            </div>
            <p className="text-xs text-[#222222]/60 font-medium tracking-wider uppercase mt-1">
              193 Quang Trung, Đại Lộc, Đà Nẵng • Hotline: 0369.117.117
            </p>
          </div>
        </div>

        {/* Right Header: Clock & Controls */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="font-display-serif text-4xl leading-none tracking-[-0.01em] text-[#0f3e17]">
              {currentTime || "08:30:00"}
            </div>
            <div className="text-xs text-[#222222]/60 capitalize font-medium mt-1">
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
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] text-xs font-semibold transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-[#e1f4df] text-[#0f3e17]"
                : "bg-[#fffefc] border border-[#efeeeb] text-[#222222]/70 hover:bg-[#efeeeb]/40"
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
            className={`h-full rounded-[14px] p-8 sm:p-10 flex flex-col justify-between transition-colors ${
              isFlashing ? "bg-[#b1dbb8]" : "bg-[#e1f4df]"
            }`}
          >
            {/* Top Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f3e17] text-[#fffefc] eyebrow">
                  <Bell className="w-4 h-4" />
                  <span>{isFlashing ? "ĐANG PHÁT LOA GỌI SỐ" : spotlight ? "SỐ VỪA ĐƯỢC GỌI" : "CHỜ LƯỢT GỌI"}</span>
                </span>

                {spotlight?.isPriority && (
                  <span className="badge-pill badge-pill-cream">
                    ƯU TIÊN Y TẾ
                  </span>
                )}
              </div>

              <div className="text-xs text-[#222222]/70 flex items-center gap-1">
                <Clock className="w-4 h-4 text-[#0f3e17]" />
                <span>Thời gian: {spotlight?.calledAt ?? "--:--:--"}</span>
              </div>
            </div>

            {/* Giant Number Display */}
            <div className="my-8 text-center space-y-4">
              <div className="eyebrow text-[#0f3e17]/80">
                Xin mời bệnh nhân có số thứ tự
              </div>

              <div
                className={`font-display-serif-medium text-8xl sm:text-8xl lg:text-9xl tracking-[-0.03em] leading-none text-[#0f3e17] transition-transform ${
                  isFlashing ? "scale-105" : ""
                }`}
              >
                {spotlight?.queueNumber ?? "—"}
              </div>

              <div className="font-display-serif-medium text-4xl sm:text-6xl text-[#0f3e17] tracking-[-0.01em] uppercase pt-2">
                {spotlight?.patientName ?? "Chưa có lượt gọi nào"}
              </div>
            </div>

            {/* Destination Room / Counter Box — Product Preview Card: cream, phẳng, không viền */}
            <div className="p-6 rounded-[14px] bg-[#fffefc] flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[14px] bg-[#e1f4df] flex items-center justify-center text-[#0f3e17] flex-shrink-0">
                  <MapPin className="w-7 h-7" />
                </div>
                <div>
                  <div className="eyebrow text-[#222222]/60">
                    Vui lòng đến
                  </div>
                  <div className="font-display-serif text-2xl sm:text-3xl tracking-[-0.01em] text-[#0f3e17] mt-1">
                    {spotlight?.counterName ?? "Màn hình sẽ tự cập nhật khi lễ tân gọi số"}
                  </div>
                  <div className="text-xs text-[#0f3e17] font-medium mt-0.5">
                    {spotlight?.roomName ?? ""}
                  </div>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-xs text-[#222222]/60">Trạng thái</span>
                <div className="text-sm font-semibold text-[#0f3e17] flex items-center gap-1.5 justify-end">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0f3e17]" />
                  Mời vào phòng
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== RIGHT: 3 THẺ ĐANG PHỤC VỤ (5 COLS) — TV 18/11:
            mỗi quầy 1 thẻ, chỉ "Đang phục vụ" + tên bệnh nhân to, tự xoay
            vòng danh sách quầy mỗi 5 giây, không hiện số CTR/tên quầy. ===================== */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="bg-[#cfe7d3] rounded-[14px] p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#fffefc]/70">
                <div className="flex items-center gap-2">
                  <Tv className="w-5 h-5 text-[#0f3e17]" />
                  <h3 className="text-sm font-semibold text-[#0f3e17] uppercase tracking-wider">
                    Đang phục vụ tại các quầy
                  </h3>
                </div>
                <span className="text-xs text-[#222222]/60">Tên tự đổi mỗi 5 giây</span>
              </div>

              {/* 3 thẻ đang phục vụ — mỗi quầy 1 thẻ, xoay vòng danh sách quầy */}
              <div className="space-y-4 mt-4">
                {counters.length === 0 && (
                  <div className="p-4 rounded-[14px] bg-[#fffefc] text-center text-xs text-[#222222]/60">
                    Đang tải hàng đợi các quầy...
                  </div>
                )}
                {counters.map((c) => {
                  const snap = counterQueues[c.counterId];
                  // Danh sách xoay vòng của quầy: người đang phục vụ (vừa gọi)
                  // trước, rồi tới người đang đợi theo thứ tự hàng đợi.
                  const pool: QueuePatient[] = [];
                  const seen = new Set<string>();
                  const push = (t: QueuePatient | null | undefined) => {
                    if (!t || !isTodayTicket(t) || !t.ticketId || seen.has(t.ticketId)) return;
                    seen.add(t.ticketId);
                    pool.push(t);
                  };
                  push(snap?.current ?? null);
                  (snap?.queue ?? []).forEach(push);
                  const shown = pool.length > 0 ? pool[rotationIndex % pool.length] : null;
                  return (
                    <div
                      key={c.counterId}
                      className="p-6 rounded-[14px] bg-[#fffefc] min-h-[150px] flex flex-col justify-center"
                    >
                      <div className="eyebrow text-[#0f3e17]/80">
                        Đang phục vụ
                      </div>
                      <div className="font-display-serif text-5xl lg:text-6xl leading-[1.1] tracking-[-0.01em] text-[#0f3e17] uppercase mt-2">
                        {shown?.patientName ?? "Quầy đang trống"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Rehab Reminder — Sage Feature Card: phẳng, không viền */}
            <div className="mt-4 p-5 rounded-[14px] bg-[#b1dbb8] text-xs space-y-1.5 text-[#0f3e17]">
              <div className="font-display-serif-medium text-xl leading-snug flex items-center gap-1.5 text-[#0c2f10]">
                <Heart className="w-4 h-4 text-[#0f3e17] flex-shrink-0" />
                <span>Lưu ý Phục hồi chức năng</span>
              </div>
              <p className="text-[11px] text-[#222222]/80 leading-relaxed">
                Người bệnh sau tai biến hoặc phẫu thuật dây chằng gối cần có người nhà đi cùng hỗ trợ khi di chuyển lên phòng tập tầng 2.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER — thông báo rút gọn + co lại được (min-w-0) để không tràn
          khỏi khung hình; badge pill 999px theo DESIGN.md. */}
      <footer className="border-t border-[#efeeeb] bg-[#fffefc] py-3.5 px-8 flex items-center justify-between gap-6 z-20 flex-wrap">
        <div className="flex-1 flex items-start gap-3 min-w-0">
          <span className="px-2.5 py-1 rounded-full bg-[#0f3e17] text-[#fffefc] text-xs font-semibold flex-shrink-0 mt-0.5">
            THÔNG BÁO BÁC SĨ THANH SANG
          </span>
          <div className="text-xs text-[#222222]/80 leading-relaxed font-medium min-w-0">
            Phòng khám chuyên khoa Phục hồi chức năng Bác sĩ Thanh Sang — 193 Quang Trung, Đại Lộc, Đà Nẵng • Hotline: 0369.117.117 • Làm việc 07:30–19:30 hằng ngày • Bốc số tại Kiosk sảnh hoặc quét mã QR check-in • Thanh toán qua VietQR.
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
