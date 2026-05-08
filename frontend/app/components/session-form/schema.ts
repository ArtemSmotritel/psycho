import * as z from 'zod'

export const sessionFormSchema = z
    .object({
        startTime: z.date().refine((date) => {
            return date > new Date()
        }, 'Please select a future date and time'),
        endTime: z.date(),
        clientId: z.string().min(1, 'Please select a client'),
        generateGoogleMeet: z.boolean().default(true).optional(),
        rescheduleGoogleMeet: z.boolean().default(false).optional(),
        googleMeetLink: z.string().optional(),
        // Ping-for-session (docs/feature-3-implementation-plan.md): backend
        // not implemented, so `fromRequestId` is never populated today.
        fromRequestId: z.string().optional(),
    })
    .refine((data) => data.endTime > data.startTime, {
        message: 'End time must be after start time',
        path: ['endTime'],
    })

export type SessionFormValues = z.infer<typeof sessionFormSchema>

// `acknowledgePingConflict` is part of the ping-for-session feature
// (docs/feature-3-implementation-plan.md); the backend is not yet
// implemented, so this option is effectively a no-op today.
export type SessionFormSubmit = (
    values: SessionFormValues,
    options: { acknowledgePingConflict: boolean },
) => Promise<void> | void

export interface SessionFormProps {
    mode: 'add' | 'edit'
    trigger?: React.ReactNode
    initialData?: Partial<SessionFormValues>
    onSubmit: SessionFormSubmit
    isLoading?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
    title?: string
    description?: string
    cancelLabel?: string
    submitLabel?: string
}
