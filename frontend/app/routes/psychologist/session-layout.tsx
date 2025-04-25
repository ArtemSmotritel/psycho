import { Link, Outlet } from "react-router";
import { useCurrentClient } from "~/hooks/useCurrentClient";
import { useCurrentSession } from "~/hooks/useCurrentSession";
import { getSessionName } from "~/utils";

export default function SessionLayout() {
  const client = useCurrentClient();
  const session = useCurrentSession();

  if (!session) {
    return (
        <div>
            <Outlet />
        </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold sm:text-l md:text-xl mb-3 text-gray-500 dark:text-gray-400">
        <Link to={`/psychologist/clients/${client?.id}/sessions/${session.id}`} className="hover:underline">
          {getSessionName(session)}
        </Link>
      </h2>
      <Outlet />
    </div>
  );
} 