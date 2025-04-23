import { format } from "date-fns";

export function getSessionName(session: { date: Date }) {
  return `Session ${formatAppDate(session.date)}`;
}

export function formatAppDate(date: Date) {
  return format(date, "PPP HH:mm");
}
