import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { AppointmentWithPsycho } from '~/models/appointment'
import { appointmentService } from '~/services/appointment.service'

export function useCurrentClientAppointment(): {
    appointment: AppointmentWithPsycho | null
    isLoading: boolean
} {
    const { appointmentId } = useParams<{ appointmentId: string }>()
    const [appointment, setAppointment] = useState<AppointmentWithPsycho | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    useEffect(() => {
        if (!appointmentId) {
            setAppointment(null)
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        appointmentService
            .getClientAppointmentById(appointmentId)
            .then((res) => {
                setAppointment(res.data.appointment)
            })
            .catch(() => {
                setAppointment(null)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [appointmentId])

    return { appointment, isLoading }
}
