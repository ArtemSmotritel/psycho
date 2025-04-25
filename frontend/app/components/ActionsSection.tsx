import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { Link } from "react-router";

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

export interface ActionItemProps {
  icon: ReactNode;
  label: string;
  variant?: ButtonVariant;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  to?: string; // For internal navigation
  href?: string; // For external links
  subtext?: string;
}

export interface ActionsSectionProps {
  title: string;
  children: ReactNode;
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
      className={`h-24 w-full md:w-[200px] ${className}`}
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
      <Link to={to} className="block w-full">
        {button}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <Link to={href} target="_blank" rel="noopener noreferrer" className="block w-full">
        {button}
      </Link>
    );
  }

  return button;
}

export function ActionsSection({ title, children }: ActionsSectionProps) {
  return (
    <div className="my-8">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="flex flex-col md:flex-row gap-4 flex-wrap">{children}</div>
    </div>
  );
} 