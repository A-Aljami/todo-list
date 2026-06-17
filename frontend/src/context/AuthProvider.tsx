import { useState, type ReactNode } from "react";
import api from "../api/axios";
import { AuthContext } from "./AuthContext";

interface User {
  id: string;
  email: string;
  createdAt: string;
}

function getStoredUser(): User | null {
  const token = localStorage.getItem("accessToken");
  const savedUser = localStorage.getItem("user");
  if (token && savedUser) {
    return JSON.parse(savedUser);
  }
  return null;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [loading] = useState(false);

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", res.data.accessToken);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const register = async (email: string, password: string) => {
    const res = await api.post("/auth/register", { email, password });
    localStorage.setItem("accessToken", res.data.accessToken);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const logout = () => {
    api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
