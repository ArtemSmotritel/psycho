import { api } from './api';
import type { FileUploadResponse, FileDeleteResponse } from '~/models/file';

export const fileService = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<FileUploadResponse>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  delete: (fileId: string) => 
    api.delete<FileDeleteResponse>(`/files/${fileId}`),
}; 