import { useState } from 'react'
import { formatISO } from 'date-fns'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { appointmentService } from '~/services/appointment.service'
import { PingConflictError, type PingConflict } from '~/components/PingConflictDialog'

interface CreateAppointmentValues {
    clientId: string
    startTime: Date
    endTime: Date
    generateGoogleMeet?: boolean
    fromRequestId?: string
}

interface CreateAppointmentOptions {
    acknowledgePingConflict?: boolean
}

export function useCreateAppointment(onSuccess?: () => void) {
    const [isCreating, setIsCreating] = useState(false)

    const handleCreate = async (
        values: CreateAppointmentValues,
        options?: CreateAppointmentOptions,
    ) => {
        if (!values.clientId) return
        setIsCreating(true)
        try {
            const { data } = await appointmentService.createForPsycho(values.clientId, {
                startTime: formatISO(values.startTime),
                endTime: formatISO(values.endTime),
                generateGoogleMeet: values.generateGoogleMeet ?? false,
                // `fromRequestId` and `acknowledgePingConflict` belong to the
                // ping-for-session feature (docs/feature-3-implementation-plan.md)
                // and are accepted but ignored by the backend today. They are
                // sent in advance so this hook needs no change when Feature 3 ships.
                ...(values.fromRequestId ? { fromRequestId: values.fromRequestId } : {}),
                ...(options?.acknowledgePingConflict ? { acknowledgePingConflict: true } : {}),
            })
            if (data.meetLinkGenerationFailed) {
                toast.warning(
                    'Appointment created, but the Google Meet link could not be generated. You can add it manually later.',
                )
            } else {
                toast.success('Appointment scheduled.')
            }
            onSuccess?.()
        } catch (err) {
            // Ping-for-session conflict path (docs/feature-3-implementation-plan.md):
            // the backend never returns `error: 'PingConflict'` today, so this
            // branch is dormant scaffolding until Feature 3 lands.
            if (
                isAxiosError(err) &&
                err.response?.status === 409 &&
                err.response.data?.error === 'PingConflict'
            ) {
                const conflictingPings: PingConflict[] = err.response.data.conflictingPings ?? []
                throw new PingConflictError(conflictingPings)
            }
            toast.error('Failed to schedule appointment. Please try again.')
        } finally {
            setIsCreating(false)
        }
    }

    return { handleCreate, isCreating }
}
