import { Link } from "react-router";
import { Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "../components/ui/sidebar";
import { useSidebarItems } from "../hooks/useSidebarItems";

export function AppSidebar() {
  const sidebarItems = useSidebarItems();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarMenu>
          {sidebarItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={item.href === location.pathname}>
                <Link to={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
} 