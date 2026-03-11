import { useEffect, useState } from 'react'
import { useAuth } from '~/contexts/auth-context'
import { appointmentService } from '~/services/appointment.service'

export function useHasActiveAppointment() {
    const { activeRole } = useAuth()
    const [hasActiveAppointment, setHasActiveAppointment] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (activeRole !== 'psycho') {
            return
        }

        setIsLoading(true)
        appointmentService
            .getActiveForPsycho()
            .then((res) => {
                setHasActiveAppointment(res.data.appointment !== null)
            })
            .catch(() => {
                setHasActiveAppointment(false)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [activeRole])

    return { hasActiveAppointment, isLoading }
}
