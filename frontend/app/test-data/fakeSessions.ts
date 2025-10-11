import { addDays, subDays, format } from "date-fns";
import type { Session, SessionListItemDTO } from "~/models/session";

export const fakeSessions: Session[] = [
  {
    id: "1",
    clientId: "1",
    date: new Date(2024, 2, 15, 10, 0),
    notes: [
      {
        id: "1",
        name: "Note 1",
        type: "note",
        text: "Initial assessment completed"
      }
    ],
    recommendations: [
      {
        id: "1",
        name: "Recommendation 1",
        type: "recommendation",
        text: "Practice mindfulness daily"
      }
    ],
    impressions: [
      {
        id: "1",
        name: "Impression 1",
        type: "impression",
        text: "Client showed good engagement"
      }
    ],
    notesCount: 1,
    recommendationsCount: 1,
    impressionsCount: 1,
    isFinished: true,
    duration: "60",
    description: "Initial consultation"
  },
  {
    id: "2",
    clientId: "2",
    date: new Date(2024, 2, 15, 14, 30),
    notes: [],
    recommendations: [],
    impressions: [],
    notesCount: 0,
    recommendationsCount: 0,
    impressionsCount: 0,
    isFinished: false,
    duration: "60",
    description: "Follow-up session"
  },
  {
    id: "3",
    clientId: "3",
    date: new Date(),
    notes: [],
    recommendations: [],
    impressions: [],
    notesCount: 0,
    recommendationsCount: 0,
    impressionsCount: 0,
    isFinished: false,
    duration: "60",
    description: "New client intake"
  },
  {
    id: "4",
    clientId: "2",
    date: addDays(new Date(), 4),
    notes: [],
    recommendations: [],
    impressions: [],
    notesCount: 0,
    recommendationsCount: 0,
    impressionsCount: 0,
  },
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `7-${i}`, 
    date: subDays(new Date(), 28 - i),
    duration: "60",
    description: "Initial consultation and assessment",
    isFinished: true,
    notes: [],
    recommendations: [],
    impressions: [],
    notesCount: 3,
    impressionsCount: 2,
    recommendationsCount: 1,
    googleMeetLink: `https://meet.google.com/xyz-${i}`,
    clientId: (i + 7).toString(),
  })),
];

export const fakeSessionsList: SessionListItemDTO[] = fakeSessions.map(session => ({ ...session, status: "finished" }));
