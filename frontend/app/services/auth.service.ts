import { api } from "./api";
import type { LoginRequest, LoginResponse } from "~/models/auth";
import { createAuthClient } from "better-auth/react";

export const authService = {
  login: (data: LoginRequest) => api.post<LoginResponse>("/auth/login", data),

  logout: () => api.post("/auth/logout"),

  getMe: () => api.get("/auth/me"),
};

export const auth = createAuthClient({
  baseURL: "http://localhost:3000",
  basePath: "/api/auth",
});
