import { AppPageHeader } from '~/components/common/AppPageHeader'
import { PageContainer } from '~/components/common/PageContainer'
import { ProtectedRoute } from '~/components/common/ProtectedRoute'
import { SessionsTable } from '~/components/sessions/SessionsTable'
import { appointmentService } from '~/services/appointment.service'

const loadAllAppointments = () =>
    appointmentService.getAllForPsycho().then((res) => res.data.appointments)

export default function Sessions() {
    return (
        <ProtectedRoute allowedRoles={['psycho']}>
            <PageContainer>
                <AppPageHeader text="Appointments" />
                <SessionsTable loadAppointments={loadAllAppointments} />
            </PageContainer>
        </ProtectedRoute>
    )
}
