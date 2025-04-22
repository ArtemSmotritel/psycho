import { HomeIcon, UsersIcon, CalendarIcon, ImageIcon } from "lucide-react";

export type SidebarItem = {
  title: string;
  icon: typeof HomeIcon;
  href: string;
};

export function useSidebarItems(): SidebarItem[] {
  return [
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
} 