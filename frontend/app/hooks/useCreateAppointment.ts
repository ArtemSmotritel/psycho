import { useState } from 'react'
import { formatISO } from 'date-fns'
import { toast } from 'sonner'
import { appointmentService } from '~/services/appointment.service'

interface CreateAppointmentValues {
    clientId: string
    startTime: Date
    endTime: Date
    generateGoogleMeet?: boolean
}

export function useCreateAppointment(onSuccess?: () => void) {
    const [isCreating, setIsCreating] = useState(false)

    const handleCreate = async (values: CreateAppointmentValues) => {
        if (!values.clientId) return
        setIsCreating(true)
        try {
            const { data } = await appointmentService.create(values.clientId, {
                startTime: formatISO(values.startTime),
                endTime: formatISO(values.endTime),
                generateGoogleMeet: values.generateGoogleMeet ?? false,
            })
            if (data.meetLinkGenerationFailed) {
                toast.warning(
                    'Appointment created, but the Google Meet link could not be generated. You can add it manually later.',
                )
            } else {
                toast.success('Appointment scheduled.')
            }
            onSuccess?.()
        } catch {
            toast.error('Failed to schedule appointment. Please try again.')
        } finally {
            setIsCreating(false)
        }
    }

    return { handleCreate, isCreating }
}
