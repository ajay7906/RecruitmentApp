import axios from "axios";
import { useAuthStore } from "../stores/authStore";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
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

let refreshPromise = null;

// Handle responses and automatic token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthRoute = originalRequest?.url?.startsWith("/auth/");

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = apiClient
            .post("/auth/refresh")
            .then((res) => res.data)
            .finally(() => {
              refreshPromise = null;
            });
        }
        const refreshed = await refreshPromise;
        const user = refreshed?.data?.user || refreshed?.user;
        const accessToken = refreshed?.data?.accessToken || refreshed?.accessToken;

        if (user && accessToken) {
          useAuthStore.getState().setAuth(user, accessToken);
          originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
          return apiClient(originalRequest);
        }
      } catch {
        useAuthStore.getState().clearAuth();
      }
    }

    return Promise.reject(error);
  }
);
