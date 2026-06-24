import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://salonease-srla.onrender.com";

export const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "wss://salonease-srla.onrender.com";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("salonease_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});