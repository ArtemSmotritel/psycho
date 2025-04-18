import { Outlet } from "react-router";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "../../components/ui/sidebar";
import { HomeIcon, UsersIcon, CalendarIcon } from "lucide-react";

const sidebarItems = [
  {
    title: "Home",
    icon: HomeIcon,
    href: "/",
  },
  {
    title: "Overview",
    icon: HomeIcon,
    href: "/psychologist/dashboard",
  },
  {
    title: "Clients",
    icon: UsersIcon,
    href: "/psychologist/dashboard/clients",
  },
  {
    title: "Appointments",
    icon: CalendarIcon,
    href: "/psychologist/dashboard/appointments",
  },
];

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
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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