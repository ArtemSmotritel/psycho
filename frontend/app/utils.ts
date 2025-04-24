import { format } from "date-fns";
import type { Session } from "./models/session";

export function getSessionName(session: { date: Date }) {
  return `Session ${formatAppDate(session.date)}`;
}

export function formatAppDate(date: Date) {
  return format(date, "PPP HH:mm");
}

export function isSessionActive(session: Session): boolean {
  if (!session?.date) return false;
  
  const sessionStart = new Date(session.date);
  const sessionEnd = new Date(sessionStart.getTime() + 60 * 60 * 1000); // 1 hour after start
  const now = new Date();
  return now >= sessionStart && now <= sessionEnd;
}
