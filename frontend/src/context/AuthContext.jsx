import React from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("salonease_token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("salonease_user");
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email, password) {
    const { data } = await api.post("/login", { email, password });
    localStorage.setItem("salonease_token", data.access_token);
    localStorage.setItem("salonease_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post("/register", payload);
    localStorage.setItem("salonease_token", data.access_token);
    localStorage.setItem("salonease_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("salonease_token");
    localStorage.removeItem("salonease_user");
    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ token, user, login, register, logout }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
