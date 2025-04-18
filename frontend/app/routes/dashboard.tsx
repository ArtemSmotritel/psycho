import { Outlet } from "react-router";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { HomeIcon, UsersIcon, CalendarIcon } from "lucide-react";

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar>
          <SidebarHeader>
            <h1 className="text-xl font-bold">Dashboard</h1>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/dashboard">
                    <HomeIcon />
                    <span>Overview</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/dashboard/clients">
                    <UsersIcon />
                    <span>Clients</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/dashboard/appointments">
                    <CalendarIcon />
                    <span>Appointments</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-auto p-6">
          <SidebarTrigger />
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
} 