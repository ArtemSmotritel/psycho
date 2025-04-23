import { Link } from "react-router";
import { Separator } from "../components/ui/separator";
import { cn } from "../lib/utils";
import { SidebarTrigger } from "./ui/sidebar";

interface AppPageHeaderProps {
  text: string;
  className?: string;
  linkTo?: string;
}

export function AppPageHeader({ text, className, linkTo }: AppPageHeaderProps) {
  return (
    <div className={cn("flex items-center mb-4", className)}>
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-lg font-semibold sm:text-xl md:text-2xl ">
        {linkTo ? (
          <Link to={linkTo} className="hover:underline">
            {text}
          </Link>
        ) : (
          text
        )}
      </h1>
    </div>
  );
} 