import { cn } from '~/lib/utils'
import type { ReactNode } from 'react'

interface PageContainerProps {
    children: ReactNode
    className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
    return <div className={cn('container mx-auto p-4', className)}>{children}</div>
}
