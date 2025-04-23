import { format, addDays, subDays } from "date-fns";

export type Client = {
  id: string;
  username: string;
  name: string;
  upcomingSession: { id: string; date: Date } | null;
  lastSession: { id: string; date: Date } | null;
  sessionsCount: number;
};

export const fakeClients: Client[] = [
  {
    id: "1",
    username: "john_doe",
    name: "John Doe",
    upcomingSession: { id: "session1", date: new Date() }, // Today
    lastSession: { id: "session2", date: subDays(new Date(), 7) },
    sessionsCount: 5,
  },
  {
    id: "2",
    username: "jane_smith",
    name: "Jane Smith",
    upcomingSession: { id: "session3", date: addDays(new Date(), 3) },
    lastSession: { id: "session4", date: subDays(new Date(), 2) },
    sessionsCount: 3,
  },
  {
    id: "3",
    username: "bob_wilson",
    name: "Bob Wilson",
    upcomingSession: null,
    lastSession: { id: "session5", date: subDays(new Date(), 14) },
    sessionsCount: 2,
  },
  {
    id: "4",
    username: "alice_johnson",
    name: "Alice Johnson",
    upcomingSession: { id: "session6", date: addDays(new Date(), 1) },
    lastSession: { id: "session7", date: subDays(new Date(), 5) },
    sessionsCount: 4,
  },
  {
    id: "5",
    username: "michael_brown",
    name: "Michael Brown",
    upcomingSession: { id: "session8", date: addDays(new Date(), 2) },
    lastSession: { id: "session9", date: subDays(new Date(), 3) },
    sessionsCount: 6,
  },
  {
    id: "6",
    username: "sarah_davis",
    name: "Sarah Davis",
    upcomingSession: { id: "session10", date: new Date() }, // Today
    lastSession: { id: "session11", date: subDays(new Date(), 1) },
    sessionsCount: 7,
  },
  {
    id: "7",
    username: "david_miller",
    name: "David Miller",
    upcomingSession: { id: "session12", date: addDays(new Date(), 4) },
    lastSession: { id: "session13", date: subDays(new Date(), 6) },
    sessionsCount: 3,
  },
  {
    id: "8",
    username: "emma_wilson",
    name: "Emma Wilson",
    upcomingSession: null,
    lastSession: { id: "session14", date: subDays(new Date(), 10) },
    sessionsCount: 4,
  },
  {
    id: "9",
    username: "james_taylor",
    name: "James Taylor",
    upcomingSession: { id: "session15", date: addDays(new Date(), 5) },
    lastSession: { id: "session16", date: subDays(new Date(), 4) },
    sessionsCount: 5,
  },
  {
    id: "10",
    username: "olivia_anderson",
    name: "Olivia Anderson",
    upcomingSession: { id: "session17", date: new Date() }, // Today
    lastSession: { id: "session18", date: subDays(new Date(), 2) },
    sessionsCount: 8,
  },
  {
    id: "11",
    username: "william_thomas",
    name: "William Thomas",
    upcomingSession: { id: "session19", date: addDays(new Date(), 6) },
    lastSession: { id: "session20", date: subDays(new Date(), 8) },
    sessionsCount: 4,
  },
  {
    id: "12",
    username: "sophia_martinez",
    name: "Sophia Martinez",
    upcomingSession: null,
    lastSession: { id: "session21", date: subDays(new Date(), 12) },
    sessionsCount: 3,
  },
  {
    id: "13",
    username: "benjamin_robinson",
    name: "Benjamin Robinson",
    upcomingSession: { id: "session22", date: addDays(new Date(), 7) },
    lastSession: { id: "session23", date: subDays(new Date(), 9) },
    sessionsCount: 6,
  },
  {
    id: "14",
    username: "isabella_clark",
    name: "Isabella Clark",
    upcomingSession: { id: "session24", date: new Date() }, // Today
    lastSession: { id: "session25", date: subDays(new Date(), 3) },
    sessionsCount: 5,
  },
  {
    id: "15",
    username: "ethan_rodriguez",
    name: "Ethan Rodriguez",
    upcomingSession: { id: "session26", date: addDays(new Date(), 8) },
    lastSession: { id: "session27", date: subDays(new Date(), 11) },
    sessionsCount: 4,
  },
  {
    id: "16",
    username: "ava_martin",
    name: "Ava Martin",
    upcomingSession: { id: "session28", date: addDays(new Date(), 9) },
    lastSession: { id: "session29", date: subDays(new Date(), 13) },
    sessionsCount: 3,
  },
  ...Array.from({ length: 20 }, (_, i) => ({
    id: (i + 17).toString(),
    username: `client_${i + 17}`,
    name: `Client ${i + 17}`,
    upcomingSession: { id: `session${i + 30}`, date: addDays(new Date(), i + 1) },
    lastSession: { id: `session${i + 31}`, date: subDays(new Date(), i + 1) },
    sessionsCount: Math.floor(Math.random() * 10) + 1,
  })),
]; 