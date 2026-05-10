import type { ComponentProps } from 'react'
import { Button } from '~/components/ui/button'

interface LimitedAddButtonProps extends Omit<
    ComponentProps<typeof Button>,
    'disabled' | 'title' | 'size' | 'children'
> {
    count: number
    limit: number
    label: string
    tooltipNoun: string
}

export function LimitedAddButton({
    count,
    limit,
    label,
    tooltipNoun,
    ...rest
}: LimitedAddButtonProps) {
    const atLimit = count >= limit
    return (
        <Button
            {...rest}
            size="sm"
            disabled={atLimit}
            title={atLimit ? `Maximum ${limit} ${tooltipNoun} per appointment reached.` : undefined}
        >
            {label}
        </Button>
    )
}
