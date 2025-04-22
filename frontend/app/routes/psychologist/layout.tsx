import { Outlet } from "react-router";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "../../components/ui/sidebar";
import { HomeIcon, UsersIcon, CalendarIcon, ImageIcon } from "lucide-react";

const sidebarItems = [
  {
    title: "Dashboard",
    icon: HomeIcon,
    href: "/psychologist",
  },
  {
    title: "Clients",
    icon: UsersIcon,
    href: "/psychologist/clients",
  },
  {
    title: "Sessions",
    icon: CalendarIcon,
    href: "/psychologist/sessions",
  },
  {
    title: "Associative Images",
    icon: ImageIcon,
    href: "/psychologist/associative-images",
  },
];

export default function PsychologistLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar>
          <SidebarHeader>
            <h1 className="text-xl font-bold">Psychologist Portal</h1>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.href}>
                      <item.icon className="mr-2 h-4 w-4" />
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