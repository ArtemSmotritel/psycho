interface EmptyMessageProps {
  title: string;
  description?: string;
  className?: string;
}

export function EmptyMessage({ title, description, className = "" }: EmptyMessageProps) {
    return (
        <div className={`flex flex-col items-center justify-center px-4 text-center ${className}`}>
            <h3 className="text-sm text-muted-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
    );
} 