import { Outlet } from "react-router";
import { AppPageHeader } from "~/components/AppPageHeader";
import { useCurrentClient } from "~/hooks/useCurrentClient";

export default function ClientLayout() {
  const client = useCurrentClient();

  return (
    <div className="container mx-auto p-4">
      <AppPageHeader text={`Profile: ${client?.name}`} linkTo={`/psychologist/clients/${client?.id}`} />
      <Outlet />
    </div>
  );
}
