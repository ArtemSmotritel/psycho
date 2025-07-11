import { format } from "date-fns";
import type { Session } from "~/models/session";

export function getSessionName(session: { date: Date }) {
  return `Session ${formatAppDate(session.date)}`;
}

export function formatAppDate(date: Date | string) {
  if (typeof date === 'string') {
    return format(new Date(date), "PPP HH:mm");
  }

  return format(date, "PPP HH:mm");
}

export function isSessionActive(session: Session): boolean {
  if (!session?.date) return false;
  
  const sessionStart = new Date(session.date);
  const sessionEnd = new Date(sessionStart.getTime() + 60 * 60 * 1000); // 1 hour after start
  const now = new Date();
  return now >= sessionStart && now <= sessionEnd;
}

export function isSessionMoreThanDayOld(sessionDate: Date | undefined): boolean {
  if (!sessionDate) return false;
  
  const sessionDateObj = new Date(sessionDate);
  const now = new Date();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  return now.getTime() - sessionDateObj.getTime() > oneDayInMs;
}

export const getAttachmentTypeLabel = (type: string) => {
  switch (type) {
    case "note":
      return "Note";
    case "recommendation":
      return "Recommendation";
    case "impression":
      return "Client Impression";
    default:
      return type;
  }
};

export const getFileUrl = (fileOrUrl: File | string) => {
  if (typeof fileOrUrl === 'string') {
    return fileOrUrl;
  }
  return URL.createObjectURL(fileOrUrl);
};
