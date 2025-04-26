export interface FileUploadResponse {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

export interface FileDeleteResponse {
  success: boolean;
  message?: string;
} 