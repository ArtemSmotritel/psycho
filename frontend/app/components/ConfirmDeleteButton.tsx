import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmAction } from './ConfirmAction'

interface ConfirmDeleteButtonProps {
    itemLabel: string
    description?: string
    onConfirm: () => void
    trigger?: ReactNode
    confirmText?: string
    title?: string
}

export function ConfirmDeleteButton({
    itemLabel,
    description,
    onConfirm,
    trigger,
    confirmText = 'Delete',
    title,
}: ConfirmDeleteButtonProps) {
    const defaultTrigger = (
        <Button type="button" variant="destructive" size="sm">
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
        </Button>
    )
    return (
        <ConfirmAction
            trigger={trigger ?? defaultTrigger}
            title={title ?? `Delete ${itemLabel}`}
            description={
                description ??
                `Are you sure you want to delete this ${itemLabel.toLowerCase()}? This action cannot be undone.`
            }
            confirmText={confirmText}
            onConfirm={onConfirm}
        />
    )
}
