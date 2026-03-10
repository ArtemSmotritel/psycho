import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { Appointment } from '~/models/appointment'
import { appointmentService } from '~/services/appointment.service'

export function useCurrentAppointment(): { appointment: Appointment | null; isLoading: boolean } {
    const { clientId, appointmentId } = useParams<{ clientId: string; appointmentId: string }>()
    const [appointment, setAppointment] = useState<Appointment | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    useEffect(() => {
        if (!clientId || !appointmentId) {
            setAppointment(null)
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        appointmentService
            .getById(clientId, appointmentId)
            .then((res) => {
                setAppointment(res.data.appointment)
            })
            .catch(() => {
                setAppointment(null)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [clientId, appointmentId])

    return { appointment, isLoading }
}
