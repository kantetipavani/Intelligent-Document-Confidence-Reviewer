import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {

    // Check if running in browser
    if (typeof window !== "undefined") {

      const token =
        localStorage.getItem("token");

      // Add token if available
      if (token) {
        config.headers.Authorization =
          `Bearer ${token}`;
      }
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(

  (response) => {
    return response;
  },

  (error) => {

    // Show backend error in console
    console.error(
      "API Error:",
      error?.response?.data ||
      error.message
    );

    // Token expired or unauthorized
    if (error?.response?.status === 401) {

      localStorage.removeItem("token");

      // Optional redirect
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;