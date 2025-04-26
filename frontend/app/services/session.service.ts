import { api } from './api';
import type { Session } from '~/models/session';

export const sessionService = {
  create: (data: Omit<Session, 'id'>) => 
    api.post<Session>('/sessions', data),

  update: (id: string, data: Partial<Session>) => 
    api.put<Session>(`/sessions/${id}`, data),

  getList: (params?: { sortBy?: string; sortOrder?: 'asc' | 'desc'; filterToday?: boolean }) => 
    api.get<Session[]>('/sessions', { params }),

  getById: (id: string) => 
    api.get<Session>(`/sessions/${id}`),

  getAttachments: (sessionId: string, params?: { type?: string }) => 
    api.get(`/sessions/${sessionId}/attachments`, { params }),
}; 