import { useParams } from 'react-router'
import type { AppointmentWithPsycho } from '~/models/appointment'
import { appointmentService } from '~/services/appointment.service'
import { useResource } from './useResource'

export function useCurrentClientAppointment(): {
    appointment: AppointmentWithPsycho | null
    isLoading: boolean
} {
    const { appointmentId } = useParams<{ appointmentId: string }>()

    const { data, isLoading } = useResource<AppointmentWithPsycho>(
        () =>
            appointmentService.getByIdForClient(appointmentId!).then((res) => res.data.appointment),
        [appointmentId],
        { enabled: !!appointmentId },
    )

    return { appointment: data, isLoading }
}
