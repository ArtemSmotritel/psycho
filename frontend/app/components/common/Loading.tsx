import { cn } from '~/lib/utils'
import { Spinner } from '../ui/spinner'

interface LoadingProps {
    text?: string
    className?: string
}

export function Loading({ text = 'Loading...', className }: LoadingProps) {
    return (
        <div
            data-testid="loading-spinner"
            className={cn('flex items-center gap-2 py-4 text-muted-foreground', className)}
        >
            <Spinner className="h-4 w-4" />
            {text ? <span>{text}</span> : null}
        </div>
    )
}
