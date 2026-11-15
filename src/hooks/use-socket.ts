"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";

export function useSocket(namespace: string = "/counters", autoConnect: boolean = true) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = getSocket(namespace);
    setSocket(s);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    if (autoConnect && !s.connected) {
      s.connect();
    } else if (s.connected) {
      setIsConnected(true);
    }

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, [namespace, autoConnect]);

  return { socket, isConnected };
}
