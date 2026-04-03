import axios from 'axios';

// In development the Vite proxy (vite.config.js) forwards /auth, /predict, etc.
// to http://localhost:8000, so baseURL can be '' (same-origin).
// For production, set VITE_API_URL=https://your-backend.com in the .env file.
const API_URL = import.meta.env.VITE_API_URL || '';

// ── Main API instance (with automatic 401 → login redirect) ──
export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Generic global error handling — redirects to /login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('token');
      // Use window location to break dependency loops with react-router
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Chat API instance (NO redirect on 401 — Chatbot handles auth inline) ──
// Using the same baseURL/proxy so CORS is handled identically.
export const chatApi = axios.create({
  baseURL: API_URL,
  timeout: 30000, // longer timeout for AI responses
});

// Attach token just like the main instance
chatApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Log errors but NEVER redirect — Chatbot shows inline errors instead
chatApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[chatApi] Error:', {
      status: error.response?.status,
      code: error.code,
      message: error.message,
      detail: error.response?.data?.detail,
    });
    return Promise.reject(error);
  }
);
