"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "./use-socket";
import { TicketCalledPayload, NewTicketPayload, CounterStatusPayload } from "@/lib/socket";

export function useQueueEvents(counterId?: string) {
  const { socket, isConnected } = useSocket("/counters", true);
  const [latestCalledTicket, setLatestCalledTicket] = useState<TicketCalledPayload | null>(null);
  const [calledHistory, setCalledHistory] = useState<TicketCalledPayload[]>([]);
  const [onlineCounters, setOnlineCounters] = useState<CounterStatusPayload[]>([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join quầy cụ thể nếu có counterId
    if (counterId) {
      socket.emit("join_counter", { counterId });
    }

    // Lắng nghe sự kiện gọi số mới.
    // Backend phát event "next_patient_called" (không phải "ticket_called":
    // hàm notifyTicketCalled của backend không có chỗ nào gọi), kèm phong bì
    // { type, data: { counterId, patient }, timestamp }.
    const handleNextPatientCalled = (msg: any) => {
      const data = msg?.data ?? msg;
      const patient = data?.patient ?? data;
      const payload: TicketCalledPayload = {
        ticketId: patient?.ticketId,
        ticketNumber: patient?.queueNumber ?? patient?.ticketNumber ?? "",
        queueNumber: patient?.queueNumber,
        counterId: data?.counterId ?? patient?.counterId,
        counterNumber: data?.counterId ?? patient?.counterId,
        patientName: patient?.patientName,
        calledAt: msg?.timestamp ?? new Date().toISOString(),
      };
      setLatestCalledTicket(payload);
      setCalledHistory((prev) => [payload, ...prev.slice(0, 9)]); // Lưu 10 lần gọi gần nhất
    };

    // Lắng nghe trạng thái quầy
    const handleCounterStatus = (data: CounterStatusPayload) => {
      setOnlineCounters((prev) => {
        const index = prev.findIndex((c) => c.counterId === data.counterId);
        if (index >= 0) {
          const next = [...prev];
          next[index] = data;
          return next;
        }
        return [...prev, data];
      });
    };

    socket.on("next_patient_called", handleNextPatientCalled);
    socket.on("counter_status", handleCounterStatus);

    return () => {
      if (counterId) {
        socket.emit("leave_counter", { counterId });
      }
      socket.off("next_patient_called", handleNextPatientCalled);
      socket.off("counter_status", handleCounterStatus);
    };
  }, [socket, isConnected, counterId]);

  // Hàm ping kiểm tra kết nối
  const sendPing = useCallback(() => {
    if (socket && isConnected) {
      socket.emit("ping");
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    latestCalledTicket,
    calledHistory,
    onlineCounters,
    sendPing,
  };
}
