import { api } from './api';
import type { Attachment } from '~/models/session';

export const attachmentService = {
  create: (data: Omit<Attachment, 'id'>) => 
    api.post<Attachment>('/attachments', data),

  update: (id: string, data: Partial<Attachment>) => 
    api.put<Attachment>(`/attachments/${id}`, data),
}; 