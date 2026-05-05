import { useAuth } from '~/contexts/auth-context'
import { appointmentService } from '~/services/appointment.service'
import { useResource } from './useResource'

export function useHasActiveAppointment() {
    const { activeRole } = useAuth()

    const { data, isLoading } = useResource<boolean>(
        () => appointmentService.getActiveForPsycho().then((res) => res.data.appointment !== null),
        [activeRole],
        { initial: false, enabled: activeRole === 'psycho' },
    )

    return { hasActiveAppointment: data ?? false, isLoading }
}
