import { addDays, subDays } from "date-fns";

export type Session = {
  id: string;
  date: Date;
  duration: number | null;
  description: string | null;
  isFinished: boolean;
  notesCount: number;
  impressionsCount: number;
  recommendationsCount: number;
};

export const fakeSessions: Session[] = [
  {
    id: "1",
    date: subDays(new Date(), 7),
    duration: 60,
    description: "Initial consultation and assessment",
    isFinished: true,
    notesCount: 3,
    impressionsCount: 2,
    recommendationsCount: 1,
  },
  {
    id: "2",
    date: subDays(new Date(), 14),
    duration: 45,
    description: "Follow-up session focusing on anxiety management lorem ipsum dolor sit amet lorem lorem lorem Follow-up session focusing on anxiety management lorem ipsum dolor sit amet lorem lorem lorem Follow-up session focusing on anxiety management lorem ipsum dolor sit amet lorem lorem lorem Follow-up session focusing on anxiety management lorem ipsum dolor sit amet lorem lorem lorem Follow-up session focusing on anxiety management lorem ipsum dolor sit amet lorem lorem lorem",
    isFinished: true,
    notesCount: 2,
    impressionsCount: 1,
    recommendationsCount: 0,
  },
  {
    id: "3",
    date: subDays(new Date(), 21),
    duration: 60,
    description: "Progress review and new coping strategies",
    isFinished: true,
    notesCount: 4,
    impressionsCount: 3,
    recommendationsCount: 2,
  },
  {
    id: "4",
    date: addDays(new Date(), 7),
    duration: null,
    description: "Upcoming session",
    isFinished: false,
    notesCount: 0,
    impressionsCount: 0,
    recommendationsCount: 0,
  },
  {
    id: "5",
    date: addDays(new Date(), 14),
    duration: null,
    description: "Upcoming session",
    isFinished: false,
    notesCount: 0,
    impressionsCount: 0,
    recommendationsCount: 0,
  },
  {
    id: "6",
    date: addDays(new Date(), 21),
    duration: null,
    description: "Upcoming session",
    isFinished: false,
    notesCount: 0,
    impressionsCount: 0,
    recommendationsCount: 0,
  },
  // add 10 more finished sessions with a loop
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `7-${i}`,
    date: subDays(new Date(), 28 - i),
    duration: 60,
    description: "Initial consultation and assessment",
    isFinished: true,
    notesCount: 3,
    impressionsCount: 2,
    recommendationsCount: 1,
  })),
]; 