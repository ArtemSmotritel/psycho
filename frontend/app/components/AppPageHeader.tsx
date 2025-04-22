import { Separator } from "../components/ui/separator";
import { cn } from "../lib/utils";
import { SidebarTrigger } from "./ui/sidebar";

interface AppPageHeaderProps {
  text: string;
  className?: string;
}

export function AppPageHeader({ text, className }: AppPageHeaderProps) {
  return (
    <div className={cn("flex items-center mb-4", className)}>
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-lg font-semibold sm:text-xl md:text-2xl ">{text}</h1>
    </div>
  );
} 