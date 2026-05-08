// Ping-for-session feature (docs/feature-3-implementation-plan.md) — frontend
// scaffolding only. The backend `appointment_requests` table and routes are
// not implemented yet, so this dialog never surfaces in practice; kept for
// when Feature 3 lands.
import { formatAppDate } from '~/utils/utils'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface PingConflict {
    id: string
    clientId: string
    clientName: string
    preferredStart: string | null
    preferredEnd: string | null
}

export class PingConflictError extends Error {
    conflictingPings: PingConflict[]
    constructor(conflictingPings: PingConflict[]) {
        super('PingConflict')
        this.name = 'PingConflictError'
        this.conflictingPings = conflictingPings
    }
}

interface PingConflictDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    conflictingPings: PingConflict[]
    onConfirm: () => void
}

export function PingConflictDialog({
    open,
    onOpenChange,
    conflictingPings,
    onConfirm,
}: PingConflictDialogProps) {
    const first = conflictingPings[0]
    const headline =
        conflictingPings.length === 1
            ? `This time overlaps with a pending request from ${first?.clientName}.`
            : `This time overlaps with ${conflictingPings.length} pending requests.`

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Pending request conflict</AlertDialogTitle>
                    <AlertDialogDescription>{headline} Book anyway?</AlertDialogDescription>
                </AlertDialogHeader>
                {conflictingPings.length > 0 && (
                    <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                        {conflictingPings.map((ping) => (
                            <li key={ping.id}>
                                <span className="font-medium">{ping.clientName}</span>
                                {ping.preferredStart && ping.preferredEnd ? (
                                    <>
                                        {' '}
                                        — {formatAppDate(ping.preferredStart)} to{' '}
                                        {formatAppDate(ping.preferredEnd)}
                                    </>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>Book anyway</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
