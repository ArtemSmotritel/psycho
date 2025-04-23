import { useParams } from "react-router";
import { fakeSessions } from "~/test-data/fakeSessions";

export function useCurrentSession() {
  const { sessionId } = useParams<{ sessionId: string }>();

  if (!sessionId) {
    return null;
  }

  const session = fakeSessions.find((s) => s.id === sessionId);

  if (!session) {
    return null;
  }

  return session;
}