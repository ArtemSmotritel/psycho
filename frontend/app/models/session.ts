export type AttachmentType = "note" | "recommendation" | "impression";

export interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  text?: string;
  voiceFiles?: (File | string)[];
  imageFiles?: (File | string)[];
}

export interface Session {
  id: string;
  clientId: string;
  date: Date;
  googleMeetLink?: string;
  notes: Attachment[];
  recommendations: Attachment[];
  impressions: Attachment[];
  notesCount: number;
  recommendationsCount: number;
  impressionsCount: number;
  isFinished?: boolean;
  duration?: string;
  description?: string;
} 