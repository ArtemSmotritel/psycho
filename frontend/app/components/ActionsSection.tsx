import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { Link } from "react-router";

interface ActionItemProps {
  icon: ReactNode;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  to?: string; // For internal navigation
  href?: string; // For external links
  subtext?: string;
}

export function ActionItem({
  icon,
  label,
  variant = "outline",
  className = "",
  onClick,
  disabled = false,
  to,
  href,
  subtext,
}: ActionItemProps) {
  const button = (
    <Button
      variant={variant}
      className={`h-24 w-full ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
        <div className="flex flex-col items-center justify-center gap-2">
            {icon}
            <span>{label}</span>
            {subtext && <span className="text-xs text-muted-foreground">{subtext}</span>}
        </div>
    </Button>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className="block">
        {button}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <Link to={href} target="_blank" rel="noopener noreferrer" className="block">
        {button}
      </Link>
    );
  }

  return button;
}

interface ActionsSectionProps {
  title: string;
  children: ReactNode;
}

export function ActionsSection({ title, children }: ActionsSectionProps) {
  return (
    <div className="my-8">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="grid gap-4 md:grid-cols-3">{children}</div>
    </div>
  );
} 