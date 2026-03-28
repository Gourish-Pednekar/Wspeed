import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const stored = JSON.parse(localStorage.getItem("biovault-auth") || "{}");
  const token = stored?.state?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401s globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("biovault-auth");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default api;
