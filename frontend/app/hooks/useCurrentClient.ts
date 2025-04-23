import { useParams } from "react-router";
import { fakeClients } from "~/test-data/fakeClients";

type MinimalClientInfo = {
  id: string;
  name: string;
  username: string;
};

export function useCurrentClient(): MinimalClientInfo | null {
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) {
    return null;
  }

  const client = fakeClients.find((c) => c.id === clientId);

  if (!client) {
    return null;
  }

  return {
    id: client.id,
    name: client.name,
    username: client.username,
  };
} 