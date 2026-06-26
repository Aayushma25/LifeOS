import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, getErrorMessage } from "../lib/api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("lifeos_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("lifeos_token");
        localStorage.removeItem("lifeos_user");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(identifier: string, password: string) {
    try {
      const res = await api.post("/auth/login", { identifier, password });
      localStorage.setItem("lifeos_token", res.data.token);
      setUser(res.data.user);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }

  async function register(data: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) {
    try {
      const res = await api.post("/auth/register", data);
      localStorage.setItem("lifeos_token", res.data.token);
      setUser(res.data.user);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }

  function logout() {
    localStorage.removeItem("lifeos_token");
    localStorage.removeItem("lifeos_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
