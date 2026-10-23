
import axios from "axios";
import { useAuthStore } from "../stores/authStore";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 20_000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the token BEFORE sending the request
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses and errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
