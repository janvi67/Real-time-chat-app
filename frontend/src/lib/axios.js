import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "https://real-time-chat-app-backend-9p1k.onrender.com/api",
  withCredentials: true,
});
