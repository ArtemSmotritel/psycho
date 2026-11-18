import { SessionsTable } from '~/components/sessions/SessionsTable'
import { appointmentService } from '~/services/appointment.service'

type ClientSessionsProps = {
    params: {
        clientId: string
    }
}

export default function ClientSessions({ params }: ClientSessionsProps) {
    return (
        <SessionsTable
            loadAppointments={() =>
                appointmentService
                    .getListForPsycho(params.clientId)
                    .then((res) => res.data.appointments)
            }
            clientId={params.clientId}
            deps={[params.clientId]}
        />
    )
}
