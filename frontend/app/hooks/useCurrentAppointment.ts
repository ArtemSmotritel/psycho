import { useParams } from 'react-router'
import type { Appointment } from '~/models/appointment'
import { appointmentService } from '~/services/appointment.service'
import { useResource } from './useResource'

export function useCurrentAppointment(): { appointment: Appointment | null; isLoading: boolean } {
    const { clientId, appointmentId } = useParams<{ clientId: string; appointmentId: string }>()

    const { data, isLoading } = useResource<Appointment>(
        () =>
            appointmentService
                .getByIdForPsycho(clientId!, appointmentId!)
                .then((res) => res.data.appointment),
        [clientId, appointmentId],
        { enabled: !!clientId && !!appointmentId },
    )

    return { appointment: data, isLoading }
}
