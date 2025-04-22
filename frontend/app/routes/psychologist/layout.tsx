import { Outlet } from "react-router";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "../../components/ui/sidebar";
import { AppSidebar } from "../../components/AppSidebar";

export default function PsychologistLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <AppSidebar />
        <SidebarInset>
          <Outlet />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
} 