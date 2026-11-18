"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService, UserProfile, LoginPayload } from "@/services/auth.service";
import { apiClient, ensureFreshToken } from "@/lib/api";
import { readSession, updateStoredUser } from "@/lib/session-store";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  selectedRoom: string;
  setSelectedRoom: (room: string) => void;
  login: (payload: LoginPayload, remember?: boolean) => Promise<UserProfile>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Khôi phục phiên đã lưu. Token hết hạn thì làm mới im lặng bằng refresh
    // token (backend POST /auth/refresh); làm mới thất bại thì hết phiên thật.
    const restore = async () => {
      const savedUser = authService.getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
      }
      const session = readSession();
      if (session?.accessToken) {
        const ok = await ensureFreshToken();
        if (!ok) {
          // Chỉ coi là hết phiên khi kho phiên đã trống (refresh token bị
          // backend từ chối nên đã xóa). Lỗi mạng nhất thời thì giữ nguyên
          // user đã lưu — trước đây lỗi nào cũng setUser(null) nên tải lại
          // trang đúng lúc mạng chập chờn là bị văng ra đăng nhập.
          if (!readSession()?.accessToken) {
            setUser(null);
          }
        } else if (!savedUser) {
          // Có token còn hạn nhưng mất thông tin user (vd xóa tay): lấy lại.
          try {
            const res = await apiClient.get<UserProfile>("/auth/me");
            setUser(res.data);
            updateStoredUser(res.data);
          } catch {
            // Không lấy được thì giữ trạng thái chưa đăng nhập.
          }
        }
      }
      const savedRoom = localStorage.getItem("revita_active_room");
      if (savedRoom) {
        setSelectedRoom(savedRoom);
      }
      setIsLoading(false);
    };
    restore();
  }, []);

  const handleSetSelectedRoom = (roomId: string) => {
    setSelectedRoom(roomId);
    if (typeof window !== "undefined") {
      localStorage.setItem("revita_active_room", roomId);
    }
  };

  const login = async (
    payload: LoginPayload,
    remember = true,
  ): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const res = await authService.login(payload, remember);
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
