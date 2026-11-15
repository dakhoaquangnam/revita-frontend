import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

// Dictionary to hold active socket connections per namespace
const socketInstances: Record<string, Socket> = {};

/**
 * Lấy hoặc khởi tạo instance Socket.io cho từng namespace
 * @param namespace Tên namespace (mặc định '/counters')
 */
export function getSocket(namespace: string = "/counters"): Socket {
  const cleanNamespace = namespace.startsWith("/") ? namespace : `/${namespace}`;
  const fullUrl = `${SOCKET_URL}${cleanNamespace}`;

  if (!socketInstances[cleanNamespace]) {
    socketInstances[cleanNamespace] = io(fullUrl, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    // Logging hỗ trợ debug
    const socket = socketInstances[cleanNamespace];

    socket.on("connect", () => {
      console.log(`[WebSocket] 🟢 Đã kết nối tới namespace: ${cleanNamespace} (ID: ${socket.id})`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[WebSocket] 🔴 Mất kết nối tới namespace ${cleanNamespace}. Lý do: ${reason}`);
    });

    socket.on("connect_error", (err) => {
      console.warn(`[WebSocket] ⚠️ Lỗi kết nối namespace ${cleanNamespace}:`, err.message);
    });
  }

  return socketInstances[cleanNamespace];
}

// Định nghĩa Types cho các sự kiện hàng đợi & gọi số.
// Backend phát "next_patient_called" với phong bì
// { type: "NEXT_PATIENT_CALLED", data: { counterId, patient }, timestamp },
// trong đó patient là ticket: { ticketId, queueNumber, patientName, ... }.
export interface TicketCalledPayload {
  ticketId?: string;
  ticketNumber: string | number;
  queueNumber?: string | number;
  counterId?: string;
  counterNumber?: string | number;
  counterName?: string;
  counterCode?: string;
  roomName?: string;
  patientName?: string;
  doctorName?: string;
  specialtyName?: string;
  calledAt: string;
}

export interface NewTicketPayload {
  ticketNumber: string | number;
  counterId?: string;
  clinicRoomId?: string;
  createdAt: string;
  priority?: boolean;
}

export interface CounterStatusPayload {
  counterId: string;
  counterNumber: string | number;
  status: "ACTIVE" | "BUSY" | "OFFLINE" | "PAUSED";
  currentTicket?: string | number;
}
