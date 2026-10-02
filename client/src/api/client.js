import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Endpoints that should NOT trigger a refresh-and-retry cycle.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = AUTH_ENDPOINTS.some((p) =>
      originalRequest.url.includes(p)
    );

    if (error.response && error.response.status === 401 && !originalRequest._retried && !isAuthEndpoint) {
      originalRequest._retried = true;
      try {
        await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        return apiClient(originalRequest);
      } catch {
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
