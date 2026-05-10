import type { ComponentProps } from 'react'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

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

    if (!atLimit) {
        return (
            <Button {...rest} size="sm">
                {label}
            </Button>
        )
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span>
                    <Button {...rest} size="sm" disabled>
                        {label}
                    </Button>
                </span>
            </TooltipTrigger>
            <TooltipContent>
                Maximum {limit} {tooltipNoun} per appointment reached.
            </TooltipContent>
        </Tooltip>
    )
}
