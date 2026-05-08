import { SearchX } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '~/components/ui/empty'

interface NotFoundProps {
    title: string
    description?: string
    className?: string
}

export function NotFound({ title, description, className }: NotFoundProps) {
    return (
        <Empty className={className}>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <SearchX />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                {description && <EmptyDescription>{description}</EmptyDescription>}
            </EmptyHeader>
        </Empty>
    )
}
