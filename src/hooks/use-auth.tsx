"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService, UserProfile, LoginPayload } from "@/services/auth.service";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  selectedRoom: string;
  setSelectedRoom: (room: string) => void;
  login: (payload: LoginPayload) => Promise<UserProfile>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Danh mục buồng khám PHCN phục vụ phân luồng ca trực
export const REHAB_ROOMS = [
  { id: "ROOM-101", name: "Phòng 101: Khám Lượng giá & Bác sĩ trưởng", type: "EXAM" },
  { id: "ROOM-102", name: "Phòng 102: Vật lý trị liệu (Điện xung / Siêu âm / Sóng ngắn)", type: "PHYSICAL" },
  { id: "ROOM-201", name: "Phòng 201: Hoạt động trị liệu & Tập Vận động phục hồi", type: "OCCUPATIONAL" },
  { id: "ROOM-202", name: "Phòng 202: Âm ngữ trị liệu (ST) & Phục hồi nhận thức", type: "SPEECH" },
  { id: "COUNTER-1", name: "Quầy tiếp đón 01 (Sảnh chính)", type: "RECEPTION" },
  { id: "COUNTER-2", name: "Quầy thu ngân & Viện phí (Cổng ra)", type: "CASHIER" },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState("ROOM-101");
  const router = useRouter();

  useEffect(() => {
    // Khôi phục thông tin user và buồng khám đã lưu từ localStorage
    const savedUser = authService.getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    }
    const savedRoom = localStorage.getItem("revita_active_room");
    if (savedRoom) {
      setSelectedRoom(savedRoom);
    }
    setIsLoading(false);
  }, []);

  const handleSetSelectedRoom = (roomId: string) => {
    setSelectedRoom(roomId);
    if (typeof window !== "undefined") {
      localStorage.setItem("revita_active_room", roomId);
    }
  };

  const login = async (payload: LoginPayload): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const res = await authService.login(payload);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    router.push("/dashboard/login");
  };

  const hasRole = (roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        selectedRoom,
        setSelectedRoom: handleSetSelectedRoom,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
