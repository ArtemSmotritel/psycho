import { api } from './api';
import type { LoginRequest, LoginResponse } from '~/models/auth';

export const authService = {
  login: (data: LoginRequest) => 
    api.post<LoginResponse>('/auth/login', data),

  logout: () => 
    api.post('/auth/logout'),

  getMe: () => 
    api.get('/auth/me'),
}; 