import { Outlet, Link } from "react-router";
import { AppPageHeader } from "~/components/AppPageHeader";
import { useCurrentClient } from "~/hooks/useCurrentClient";
import { useCurrentSession } from "~/hooks/useCurrentSession";
import { getSessionName } from "~/utils";

export default function ClientLayout() {
  const client = useCurrentClient();
  const session = useCurrentSession();

  return (
    <div className="container mx-auto p-4">
      <AppPageHeader text={`Profile: ${client?.name}`} linkTo={`/psychologist/clients/${client?.id}`} className={session ? 'mb-0' : ''} />
      {session && (
        <h6 className="text-lg font-semibold sm:text-l md:text-xl mb-4 text-gray-500 dark:text-gray-400 mb-8">
          <Link to={`/psychologist/clients/${client?.id}/sessions/${session.id}`} className="hover:underline">
            {getSessionName(session)}
          </Link>
        </h6>
      )}
      <Outlet />
    </div>
  );
}
