import { useState } from 'react'
import { PingConflictError, type PingConflict } from '@/components/PingConflictDialog'

interface UsePingConflictSubmitOptions<TValues> {
    onSubmit: (
        values: TValues,
        options: { acknowledgePingConflict: boolean },
    ) => Promise<void> | void
    onFinish?: () => void
}

export interface UsePingConflictSubmitResult<TValues> {
    pingConflict: PingConflict[] | null
    submit: (values: TValues) => void
    confirmConflict: () => void
    resetConflict: () => void
}

export function usePingConflictSubmit<TValues>({
    onSubmit,
    onFinish,
}: UsePingConflictSubmitOptions<TValues>): UsePingConflictSubmitResult<TValues> {
    const [pingConflict, setPingConflict] = useState<PingConflict[] | null>(null)
    const [pendingValues, setPendingValues] = useState<TValues | null>(null)

    async function run(values: TValues, acknowledge: boolean) {
        try {
            await onSubmit(values, { acknowledgePingConflict: acknowledge })
            setPingConflict(null)
            setPendingValues(null)
            onFinish?.()
        } catch (err) {
            if (err instanceof PingConflictError) {
                setPingConflict(err.conflictingPings)
                setPendingValues(values)
                return
            }
            setPingConflict(null)
            setPendingValues(null)
            onFinish?.()
        }
    }

    return {
        pingConflict,
        submit: (values) => void run(values, false),
        confirmConflict: () => {
            if (!pendingValues) {
                setPingConflict(null)
                return
            }
            setPingConflict(null)
            void run(pendingValues, true)
        },
        resetConflict: () => {
            setPingConflict(null)
            setPendingValues(null)
        },
    }
}
