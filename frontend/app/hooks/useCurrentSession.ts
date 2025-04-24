import { useParams } from "react-router";
import { fakeSessions } from "~/test-data/fakeSessions";

export type AttachmentType = "note" | "recommendation" | "impression";

interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  text?: string;
  voiceFiles?: File[];
  imageFiles?: File[];
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
}

export function useCurrentSession(): Session | null {
  const { sessionId } = useParams();

  if (!sessionId) {
    return null;
  }

  const session = fakeSessions.find((s) => s.id === sessionId);

  if (!session) {
    return null;
  }

  return {
    ...session,
    notes: [
      {
        id: "1",
        name: "Initial Assessment",
        type: "note",
        text: "Client presented with symptoms of anxiety and stress. Discussed coping mechanisms and relaxation techniques."
      },
    ],
    recommendations: [
      {
        id: "2", 
        name: "Daily Mindfulness Practice",
        type: "recommendation",
        text: "Practice 10 minutes of mindfulness meditation each morning to help manage anxiety levels."
      }
    ],
    impressions: [
      {
        id: "3",
        name: "First Session Impression",
        type: "impression", 
        text: "Client was engaged and receptive to therapeutic discussion. Shows good insight into their challenges."
      },
    ],
  };
}